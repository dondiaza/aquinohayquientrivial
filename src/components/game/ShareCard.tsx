'use client';

import { SERIE } from '@/content/serie';

import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useAudio } from '@/lib/audio/AudioProvider';

export type DatosTarjeta = {
  titulo: string;
  puntos: number;
  rango: string;
  precision: number;
  mejorRacha: number;
  formato: string;
  etiqueta?: string | null;
};

/**
 * TARJETA COMPARTIBLE — se dibuja en un canvas con gráficos PROPIOS (nada de material
 * de terceros) y se puede compartir con la API del sistema o descargar como PNG.
 *
 * Se dibuja bajo demanda: no hay coste hasta que el jugador pulsa.
 */
export function ShareCard({ datos, url }: { datos: DatosTarjeta; url: string }) {
  const { sonar } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [estado, setEstado] = useState<'idle' | 'lista' | 'copiada' | 'error'>('idle');

  const dibujar = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const W = canvas.width;
    const H = canvas.height;

    // Pared de gotelé
    ctx.fillStyle = '#e7e0d2';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(35,32,27,0.05)';
    for (let y = 0; y < H; y += 8) {
      for (let x = 0; x < W; x += 8) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Placa verde
    ctx.fillStyle = '#1e4b3e';
    ctx.fillRect(40, 40, W - 80, 150);
    ctx.strokeStyle = '#123329';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, W - 80, 150);

    ctx.fillStyle = '#eee7d5';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('EL TRIVIAL DE LA COMUNIDAD', 64, 90);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#f2cd76';
    ctx.fillText(`${SERIE.direccionFicticia} · ${SERIE.cadena}`, 64, 122);
    ctx.fillStyle = '#eee7d5';
    ctx.font = '16px monospace';
    ctx.fillText(datos.formato.toUpperCase(), 64, 158);

    // Papel del acta
    ctx.fillStyle = '#f7f2e6';
    ctx.fillRect(40, 210, W - 80, 300);
    ctx.strokeStyle = 'rgba(35,32,27,0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 210, W - 80, 300);

    // Puntuación
    ctx.fillStyle = '#1e4b3e';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.fillText(String(datos.puntos), 70, 320);
    ctx.fillStyle = '#5b544a';
    ctx.font = '18px monospace';
    ctx.fillText('PUNTOS', 74, 348);

    // Datos
    ctx.fillStyle = '#23201b';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`Rango: ${datos.rango}`, 70, 400);
    ctx.fillText(`Aciertos: ${datos.precision} %`, 70, 434);
    ctx.fillText(`Mejor racha: ${datos.mejorRacha}`, 70, 468);

    // Sello de desafío
    if (datos.etiqueta) {
      ctx.save();
      ctx.translate(W - 150, 300);
      ctx.rotate(-0.14);
      ctx.strokeStyle = '#a6301e';
      ctx.lineWidth = 4;
      ctx.strokeRect(-70, -34, 140, 68);
      ctx.fillStyle = '#a6301e';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(datos.etiqueta, 0, 8);
      ctx.restore();
      ctx.textAlign = 'left';
    }

    // Pie
    ctx.fillStyle = '#5b544a';
    ctx.font = '16px monospace';
    ctx.fillText(url.replace(/^https?:\/\//, ''), 40, H - 30);

    return canvas;
  }, [datos, url]);

  const compartir = useCallback(async () => {
    sonar('sello');
    const canvas = dibujar();
    if (!canvas) {
      setEstado('error');
      return;
    }
    setEstado('lista');

    const texto = `${datos.titulo}: ${datos.puntos} puntos · ${datos.precision} % de aciertos · rango ${datos.rango}${
      datos.etiqueta ? ` · desafío ${datos.etiqueta}` : ''
    }`;

    // 1) Compartir imagen con la API del sistema, si está disponible.
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((resultado) => resolve(resultado), 'image/png'),
      );
      if (blob && typeof navigator !== 'undefined' && 'share' in navigator) {
        const archivo = new File([blob], 'acta-de-la-comunidad.png', { type: 'image/png' });
        const datosCompartir: ShareData & { files?: File[] } = { title: datos.titulo, text: texto, url };
        if ('canShare' in navigator && navigator.canShare?.({ files: [archivo] })) {
          datosCompartir.files = [archivo];
        }
        await navigator.share(datosCompartir);
        return;
      }
    } catch {
      /* el usuario ha cancelado o no se puede compartir: seguimos con el plan B */
    }

    // 2) Plan B: copiar el texto al portapapeles.
    try {
      await navigator.clipboard.writeText(`${texto} — ${url}`);
      setEstado('copiada');
    } catch {
      setEstado('error');
    }
  }, [datos, dibujar, sonar, url]);

  const descargar = useCallback(() => {
    sonar('papel');
    const canvas = dibujar();
    if (!canvas) return;
    const enlace = document.createElement('a');
    enlace.download = 'acta-de-la-comunidad.png';
    enlace.href = canvas.toDataURL('image/png');
    enlace.click();
  }, [dibujar, sonar]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button tone="mostaza" onClick={() => void compartir()}>
          📤 Compartir resultado
        </Button>
        <Button tone="papel" size="sm" onClick={descargar}>
          Descargar tarjeta
        </Button>
      </div>

      {estado === 'copiada' ? (
        <p className="texto-sello text-verde-portal" role="status">
          Copiado al portapapeles
        </p>
      ) : null}
      {estado === 'error' ? (
        <p className="texto-sello text-rojo-buzon" role="status">
          No se ha podido compartir. Prueba a descargar la tarjeta.
        </p>
      ) : null}

      {/* El canvas se mantiene fuera de pantalla: es el lienzo de la tarjeta */}
      <canvas ref={canvasRef} width={720} height={620} className="sr-only" aria-hidden />
    </div>
  );
}
