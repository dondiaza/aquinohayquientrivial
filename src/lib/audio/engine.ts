/**
 * MOTOR DE AUDIO — todos los sonidos se SINTETIZAN aquí con Web Audio.
 *
 * Por qué sintetizar y no usar ficheros:
 *   · Son originales por construcción: ni un audio de terceros, ni licencias que revisar.
 *   · Pesan cero bytes: no hay descargas ni caché de assets.
 *   · Se pueden modular en tiempo real (el combo suena más alto y más agudo según sube).
 *
 * Reglas de la casa:
 *   · NUNCA suena nada antes de una interacción del usuario (el AudioContext se crea en
 *     el primer gesto: es lo que exigen los navegadores y además es de buena educación).
 *   · Cada señal sonora tiene equivalente visual y textual (accesibilidad, §35).
 *   · Silencio y volumen se guardan en localStorage.
 */

export const SONIDOS = [
  'seleccion',
  'acierto',
  'fallo',
  'parcial',
  'bonus',
  'combo',
  'tic',
  'tiempo',
  'comodin',
  'evento',
  'ronda',
  'ascensor',
  'papel',
  'sello',
  'victoria',
  'derrota',
  'timbre',
  'ranking',
  'puerta',
] as const;

export type SonidoId = (typeof SONIDOS)[number];

export type AjustesAudio = {
  silencio: boolean;
  /** 0..1 */
  volumen: number;
  /** Ambiente muy sutil del portal (opcional, por defecto apagado). */
  ambiente: boolean;
};

export const AJUSTES_AUDIO_POR_DEFECTO: AjustesAudio = {
  silencio: false,
  volumen: 0.6,
  ambiente: false,
};

export const CLAVE_AJUSTES_AUDIO = 'ahqv:audio';

type Onda = OscillatorType;

type NotaOptions = {
  frecuencia: number;
  duracion: number;
  tipo?: Onda;
  volumen?: number;
  retardo?: number;
  /** Deslizamiento de frecuencia hasta este valor. */
  hasta?: number;
  /** Filtro paso bajo. */
  pasoBajo?: number;
  /** Filtro paso alto. */
  pasoAlto?: number;
  /** Tiempo de ataque en segundos. */
  ataque?: number;
};

type RuidoOptions = {
  duracion: number;
  volumen?: number;
  retardo?: number;
  pasoAlto?: number;
  pasoBajo?: number;
};

export class MotorDeAudio {
  private contexto: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private ajustes: AjustesAudio = { ...AJUSTES_AUDIO_POR_DEFECTO };
  private ambienteActivo: { fuente: AudioBufferSourceNode; ganancia: GainNode } | null = null;

  configurar(ajustes: AjustesAudio): void {
    this.ajustes = ajustes;
    if (this.maestro && this.contexto) {
      this.maestro.gain.setTargetAtTime(
        ajustes.silencio ? 0 : ajustes.volumen,
        this.contexto.currentTime,
        0.02,
      );
    }
    if (!ajustes.ambiente || ajustes.silencio) this.pararAmbiente();
    else if (this.contexto) this.arrancarAmbiente();
  }

  /** Crea (o reanuda) el contexto. Debe llamarse desde un gesto del usuario. */
  desbloquear(): void {
    if (typeof window === 'undefined') return;
    if (!this.contexto) {
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      this.contexto = new Constructor();
      this.maestro = this.contexto.createGain();
      this.maestro.gain.value = this.ajustes.silencio ? 0 : this.ajustes.volumen;
      this.maestro.connect(this.contexto.destination);
    }
    if (this.contexto.state === 'suspended') void this.contexto.resume();
    if (this.ajustes.ambiente && !this.ajustes.silencio) this.arrancarAmbiente();
  }

  get disponible(): boolean {
    return this.contexto !== null;
  }

  // ── Ladrillos de síntesis ─────────────────────────────────────────────────

  private nota(opciones: NotaOptions): void {
    const contexto = this.contexto;
    const maestro = this.maestro;
    if (!contexto || !maestro) return;

    const inicio = contexto.currentTime + (opciones.retardo ?? 0);
    const oscilador = contexto.createOscillator();
    oscilador.type = opciones.tipo ?? 'sine';
    oscilador.frequency.setValueAtTime(opciones.frecuencia, inicio);
    if (opciones.hasta) {
      oscilador.frequency.exponentialRampToValueAtTime(
        Math.max(20, opciones.hasta),
        inicio + opciones.duracion,
      );
    }

    const ganancia = contexto.createGain();
    const pico = opciones.volumen ?? 0.25;
    const ataque = opciones.ataque ?? 0.006;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(pico, inicio + ataque);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + opciones.duracion);

    let destino: AudioNode = ganancia;
    if (opciones.pasoBajo) {
      const filtro = contexto.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = opciones.pasoBajo;
      ganancia.connect(filtro);
      destino = filtro;
    }
    if (opciones.pasoAlto) {
      const filtro = contexto.createBiquadFilter();
      filtro.type = 'highpass';
      filtro.frequency.value = opciones.pasoAlto;
      destino.connect(filtro);
      destino = filtro;
    }

    oscilador.connect(ganancia);
    destino.connect(maestro);
    oscilador.start(inicio);
    oscilador.stop(inicio + opciones.duracion + 0.02);
  }

  private ruido(opciones: RuidoOptions): void {
    const contexto = this.contexto;
    const maestro = this.maestro;
    if (!contexto || !maestro) return;

    const inicio = contexto.currentTime + (opciones.retardo ?? 0);
    const muestras = Math.max(1, Math.floor(contexto.sampleRate * opciones.duracion));
    const buffer = contexto.createBuffer(1, muestras, contexto.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i += 1) {
      datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
    }

    const fuente = contexto.createBufferSource();
    fuente.buffer = buffer;

    const ganancia = contexto.createGain();
    ganancia.gain.value = opciones.volumen ?? 0.16;

    let destino: AudioNode = ganancia;
    if (opciones.pasoAlto) {
      const filtro = contexto.createBiquadFilter();
      filtro.type = 'highpass';
      filtro.frequency.value = opciones.pasoAlto;
      ganancia.connect(filtro);
      destino = filtro;
    }
    if (opciones.pasoBajo) {
      const filtro = contexto.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = opciones.pasoBajo;
      destino.connect(filtro);
      destino = filtro;
    }

    fuente.connect(ganancia);
    destino.connect(maestro);
    fuente.start(inicio);
  }

  // ── Ambiente ──────────────────────────────────────────────────────────────

  private arrancarAmbiente(): void {
    const contexto = this.contexto;
    const maestro = this.maestro;
    if (!contexto || !maestro || this.ambienteActivo) return;

    // Zumbido de portal: ruido marrón muy filtrado, casi inaudible.
    const segundos = 4;
    const muestras = contexto.sampleRate * segundos;
    const buffer = contexto.createBuffer(1, muestras, contexto.sampleRate);
    const datos = buffer.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < muestras; i += 1) {
      const blanco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * blanco) / 1.02;
      datos[i] = ultimo * 3.5;
    }

    const fuente = contexto.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;

    const filtro = contexto.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 320;

    const ganancia = contexto.createGain();
    ganancia.gain.value = 0.05;

    fuente.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(maestro);
    fuente.start();

    this.ambienteActivo = { fuente, ganancia };
  }

  private pararAmbiente(): void {
    if (!this.ambienteActivo) return;
    try {
      this.ambienteActivo.fuente.stop();
    } catch {
      /* ya estaba parada */
    }
    this.ambienteActivo = null;
  }

  // ── Catálogo de sonidos ───────────────────────────────────────────────────

  reproducir(id: SonidoId, intensidad = 1): void {
    if (this.ajustes.silencio) return;
    if (!this.contexto) return;
    if (this.contexto.state === 'suspended') void this.contexto.resume();

    switch (id) {
      case 'seleccion':
        this.nota({ frecuencia: 660, duracion: 0.05, tipo: 'square', volumen: 0.1, pasoBajo: 1800 });
        break;

      case 'acierto':
        // Arpegio mayor ascendente: la señal de "bien" del concurso.
        [523.25, 659.25, 783.99].forEach((frecuencia, indice) =>
          this.nota({
            frecuencia,
            duracion: 0.16,
            tipo: 'triangle',
            volumen: 0.22,
            retardo: indice * 0.055,
          }),
        );
        break;

      case 'parcial':
        [523.25, 622.25].forEach((frecuencia, indice) =>
          this.nota({
            frecuencia,
            duracion: 0.14,
            tipo: 'triangle',
            volumen: 0.18,
            retardo: indice * 0.07,
          }),
        );
        break;

      case 'fallo':
        this.nota({ frecuencia: 233, duracion: 0.18, tipo: 'sawtooth', volumen: 0.16, pasoBajo: 900 });
        this.nota({
          frecuencia: 175,
          duracion: 0.26,
          tipo: 'sawtooth',
          volumen: 0.16,
          retardo: 0.12,
          pasoBajo: 800,
        });
        break;

      case 'bonus':
        this.nota({ frecuencia: 880, duracion: 0.3, tipo: 'sine', volumen: 0.16 });
        this.nota({ frecuencia: 1320, duracion: 0.34, tipo: 'sine', volumen: 0.09, retardo: 0.03 });
        break;

      case 'combo': {
        // Cuanto más alto el combo, más notas y más agudo: la escalada se oye.
        const nivel = Math.max(1, Math.min(4, Math.round(intensidad)));
        const base = 523.25 * (1 + (nivel - 1) * 0.12);
        for (let i = 0; i < nivel + 1; i += 1) {
          this.nota({
            frecuencia: base * Math.pow(1.26, i),
            duracion: 0.13,
            tipo: 'triangle',
            volumen: 0.15 + nivel * 0.02,
            retardo: i * 0.05,
          });
        }
        break;
      }

      case 'tic':
        this.nota({ frecuencia: 1200, duracion: 0.03, tipo: 'square', volumen: 0.07, pasoBajo: 2600 });
        break;

      case 'tiempo':
        // Zumbido de telefonillo cuando no te abren.
        for (let i = 0; i < 3; i += 1) {
          this.nota({
            frecuencia: 150,
            duracion: 0.12,
            tipo: 'square',
            volumen: 0.16,
            retardo: i * 0.16,
            pasoBajo: 700,
          });
        }
        break;

      case 'comodin':
        this.nota({
          frecuencia: 320,
          hasta: 1250,
          duracion: 0.3,
          tipo: 'triangle',
          volumen: 0.16,
        });
        this.ruido({ duracion: 0.12, volumen: 0.05, pasoAlto: 2200, retardo: 0.22 });
        break;

      case 'evento':
      case 'timbre':
        // Ding-dong del portal.
        this.nota({ frecuencia: 659.25, duracion: 0.5, tipo: 'sine', volumen: 0.2 });
        this.nota({ frecuencia: 523.25, duracion: 0.7, tipo: 'sine', volumen: 0.2, retardo: 0.24 });
        break;

      case 'ronda':
        // Acorde de entrada de concurso: tríada + golpe de percusión.
        [392, 523.25, 659.25].forEach((frecuencia) =>
          this.nota({ frecuencia, duracion: 0.75, tipo: 'triangle', volumen: 0.14 }),
        );
        this.ruido({ duracion: 0.18, volumen: 0.12, pasoBajo: 1400 });
        this.nota({ frecuencia: 784, duracion: 0.4, tipo: 'sine', volumen: 0.12, retardo: 0.5 });
        break;

      case 'ascensor':
        // "Ding" metálico de llegada de planta.
        this.nota({ frecuencia: 1046.5, duracion: 0.5, tipo: 'sine', volumen: 0.18 });
        this.nota({ frecuencia: 1568, duracion: 0.35, tipo: 'sine', volumen: 0.08, retardo: 0.02 });
        break;

      case 'papel':
        this.ruido({ duracion: 0.11, volumen: 0.1, pasoAlto: 1800 });
        break;

      case 'puerta':
        this.nota({ frecuencia: 120, duracion: 0.16, tipo: 'sine', volumen: 0.2, pasoBajo: 400 });
        this.ruido({ duracion: 0.09, volumen: 0.08, pasoAlto: 900, retardo: 0.02 });
        break;

      case 'sello':
        this.nota({ frecuencia: 90, duracion: 0.12, tipo: 'sine', volumen: 0.26, pasoBajo: 300 });
        this.ruido({ duracion: 0.07, volumen: 0.14, pasoAlto: 1200 });
        break;

      case 'ranking':
        for (let i = 0; i < 5; i += 1) {
          this.nota({
            frecuencia: 500 + i * 110,
            duracion: 0.09,
            tipo: 'square',
            volumen: 0.08,
            retardo: i * 0.08,
            pasoBajo: 2200,
          });
        }
        break;

      case 'victoria':
        [523.25, 659.25, 783.99, 1046.5].forEach((frecuencia, indice) =>
          this.nota({
            frecuencia,
            duracion: indice === 3 ? 0.6 : 0.18,
            tipo: 'triangle',
            volumen: 0.2,
            retardo: indice * 0.11,
          }),
        );
        break;

      case 'derrota':
        [392, 329.63, 261.63].forEach((frecuencia, indice) =>
          this.nota({
            frecuencia,
            duracion: 0.32,
            tipo: 'sawtooth',
            volumen: 0.14,
            retardo: indice * 0.16,
            pasoBajo: 900,
          }),
        );
        break;
    }
  }
}

/** Motor único del proceso. */
let motor: MotorDeAudio | null = null;

export function obtenerMotorDeAudio(): MotorDeAudio {
  if (!motor) motor = new MotorDeAudio();
  return motor;
}

export function leerAjustesGuardados(): AjustesAudio {
  if (typeof window === 'undefined') return { ...AJUSTES_AUDIO_POR_DEFECTO };
  try {
    const crudo = window.localStorage.getItem(CLAVE_AJUSTES_AUDIO);
    if (!crudo) return { ...AJUSTES_AUDIO_POR_DEFECTO };
    const datos = JSON.parse(crudo) as Partial<AjustesAudio>;
    return {
      silencio: typeof datos.silencio === 'boolean' ? datos.silencio : false,
      volumen:
        typeof datos.volumen === 'number' && datos.volumen >= 0 && datos.volumen <= 1
          ? datos.volumen
          : AJUSTES_AUDIO_POR_DEFECTO.volumen,
      ambiente: typeof datos.ambiente === 'boolean' ? datos.ambiente : false,
    };
  } catch {
    return { ...AJUSTES_AUDIO_POR_DEFECTO };
  }
}

export function guardarAjustes(ajustes: AjustesAudio): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLAVE_AJUSTES_AUDIO, JSON.stringify(ajustes));
  } catch {
    /* sin almacenamiento: los ajustes duran esta sesión */
  }
}
