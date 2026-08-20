// The reel spec. One JSON object per reel in src/reels.json; everything the
// composition needs is in here so a reel can be re-cut by editing data, not code.

export type GrammarName = 'whip' | 'through' | 'deck' | 'jump' | 'rise';
export type OpenerKind = 'snap' | 'settle' | 'bloom' | 'typeLine';

export interface BrandFont {
   // @remotion/google-fonts import names (the subpath after the slash),
   // e.g. 'BricolageGrotesque' / 'PlusJakartaSans' — same as the config's
   // fontDisplay / fontBody.
   display: string;
   body: string;
}

export interface Brand {
   name: string;
   // [plain, gradient] halves of the wordmark, e.g. ['Lu', 'men']. Defaults
   // to the whole name plain.
   wordmark?: [string, string];
   // Path under the Remotion public dir, e.g. 'brand/logo.png'.
   logo: string;
   accent: string;
   accent2: string;
   surface: string;
   ink?: string;
   font: BrandFont;
}

export interface CaptionCue {
   // Seconds into the beat.
   at: number;
   text: string;
}

export interface PlateRef {
   // plates/<name>/0000.png … or plates/<name>.mp4 when video is true.
   name: string;
   // PNG frame count; needed to hold on the last frame.
   frames?: number;
   video?: boolean;
}

export interface PlateBeat {
   kind: 'plate';
   plate: PlateRef;
   // Seconds into the plate's own clock at which this beat starts (frame 0
   // of the beat should already be mid-motion).
   plateOffset?: number;
   captions?: CaptionCue[];
   seconds: number;
   // Overrides the frame-size default.
   deviceScale?: number;
}

export interface ChipsBeat {
   kind: 'chips';
   kicker?: string;
   items: string[];
   seconds: number;
}

export interface LockBeat {
   kind: 'lock';
   pushTitle: string;
   pushBody: string;
   time?: string;
   date?: string;
   caption?: string;
   seconds: number;
}

export type Beat = PlateBeat | ChipsBeat | LockBeat;

export interface Hook {
   kicker?: string;
   // Words wrapped in *asterisks* take the accent gradient.
   lines: string[];
   seconds?: number;
}

export interface Cta {
   sub: string;
   pill: string;
   domain: string;
   seconds?: number;
}

export interface ReelSpec {
   id: string;
   // Optional hard override; otherwise derived from hook + beats + cta minus
   // the transition overlaps.
   duration?: number;
   grammar: GrammarName;
   opener: OpenerKind;
   brand: Brand;
   hook: Hook;
   beats: Beat[];
   cta: Cta;
}

export const FPS = 30;
export const HOOK_SECONDS = 2.4;
export const CTA_SECONDS = 3;
