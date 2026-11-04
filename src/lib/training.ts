/**
 * Program generator built on hypertrophy research:
 * - Frequency: each muscle ~2×/week (Schoenfeld, Ogborn & Krieger 2016).
 * - Volume: ~10+ hard sets per muscle per week, more for trained lifters (Schoenfeld 2017 dose-response).
 * - Effort: sets taken to 1–3 reps in reserve (Refalo 2023; Helms RIR).
 * - Rest: 2–3 min for compound lifts (Schoenfeld 2016 rest-interval study), shorter for isolation.
 * - Progression: double progression (reps first, then load).
 * Exercise images: free-exercise-db (public domain, The Unlicense).
 */
import type { Lang } from './i18n';
import type { Experience, Profile } from './nutrition';

export type Equipment = 'gym' | 'dumbbells' | 'bodyweight';
export type Muscle = 'chest' | 'back' | 'shoulders' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'biceps' | 'triceps' | 'abs';

export const MUSCLE_NAMES: Record<Lang, Record<Muscle, string>> = {
  en: { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', biceps: 'Biceps', triceps: 'Triceps', abs: 'Abs' },
  az: { chest: 'Sinə', back: 'Kürək', shoulders: 'Çiyin', quads: 'Bud önü', hamstrings: 'Bud arxası', glutes: 'Sağrı', calves: 'Baldır', biceps: 'Biseps', triceps: 'Triseps', abs: 'Qarın' },
};

export interface ExerciseInfo {
  en: string;
  az: string;
  compound: boolean;
  lower: boolean;
  muscles: Muscle[];
  /** Held for time instead of reps. */
  timed?: boolean;
  cues: { en: string[]; az: string[] };
}

export const EXERCISES: Record<string, ExerciseInfo> = {
  Barbell_Squat: {
    en: 'Barbell back squat', az: 'Ştanqla squat', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Bar on upper back, feet shoulder-width, toes slightly out.', 'Brace your core, sit down between your hips until thighs are at least parallel.', 'Knees track over toes; drive up through the whole foot.'],
      az: ['Ştanq kürəyin yuxarısında, ayaqlar çiyin genişliyində, barmaqlar azca çölə.', 'Qarını sıx, budlar ən azı paralel olana qədər aşağı otur.', 'Dizlər barmaqların istiqamətində; bütün pəncə ilə yuxarı it.'],
    },
  },
  Goblet_Squat: {
    en: 'Goblet squat', az: 'Qoblet squat', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Hold a dumbbell at your chest, elbows down.', 'Sit straight down, chest up, elbows inside the knees.', 'Pause briefly at the bottom, stand up.'],
      az: ['Hanteli sinənin qarşısında tut, dirsəklər aşağı.', 'Sinə dik, düz aşağı otur, dirsəklər dizlərin içində.', 'Aşağıda qısa dayan, sonra qalx.'],
    },
  },
  Bodyweight_Squat: {
    en: 'Bodyweight squat', az: 'Öz çəkinlə squat', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Feet shoulder-width, arms forward for balance.', 'Sit back and down as deep as you can with a flat back.', 'Go slow (3 s down) to make it harder.'],
      az: ['Ayaqlar çiyin genişliyində, qollar tarazlıq üçün irəli.', 'Bel düz qalmaqla bacardığın qədər dərin otur.', 'Çətinləşdirmək üçün yavaş en (3 saniyə).'],
    },
  },
  Leg_Press: {
    en: 'Leg press', az: 'Ayaq presi', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Feet mid-platform, shoulder-width.', 'Lower until knees reach ~90° without your lower back lifting off the pad.', 'Press up without locking the knees hard.'],
      az: ['Ayaqlar platformanın ortasında, çiyin genişliyində.', 'Dizlər ~90° olana qədər endir, bel oturacaqdan qalxmasın.', 'Dizləri sərt kilidləmədən yuxarı it.'],
    },
  },
  Split_Squat_with_Dumbbells: {
    en: 'Dumbbell split squat', az: 'Hantellə split squat', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Long stance, dumbbells at your sides.', 'Drop the back knee straight down toward the floor.', 'Front heel stays down; push through it to rise.'],
      az: ['Uzun addım, hantellər yanlarda.', 'Arxa dizi düz yerə doğru endir.', 'Ön daban yerdə qalır; ondan itələyib qalx.'],
    },
  },
  Split_Squats: {
    en: 'Split squat', az: 'Split squat', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Long stance, torso upright.', 'Lower the back knee toward the floor under control.', 'Do all reps on one leg, then switch.'],
      az: ['Uzun addım, gövdə dik.', 'Arxa dizi nəzarətlə yerə doğru endir.', 'Bir ayaqla bütün təkrarları et, sonra dəyiş.'],
    },
  },
  Romanian_Deadlift: {
    en: 'Romanian deadlift', az: 'Rumın deadlifti', compound: true, lower: true, muscles: ['hamstrings', 'glutes'],
    cues: {
      en: ['Soft knees, push your hips back like closing a door with your butt.', 'Bar slides down the thighs; back stays flat.', 'Stop when you feel a strong hamstring stretch, then squeeze glutes up.'],
      az: ['Dizlər azca bükük, kalçanı arxaya it (sağrı ilə qapı bağlayırmış kimi).', 'Ştanq budlar boyunca sürüşür; bel düz qalır.', 'Bud arxasında güclü dartılma hiss edəndə dayan, sağrını sıxıb qalx.'],
    },
  },
  'Stiff-Legged_Dumbbell_Deadlift': {
    en: 'Dumbbell Romanian deadlift', az: 'Hantellə rumın deadlifti', compound: true, lower: true, muscles: ['hamstrings', 'glutes'],
    cues: {
      en: ['Dumbbells in front of thighs, knees slightly bent.', 'Hinge at the hips with a flat back.', 'Feel the hamstrings stretch, then drive hips forward.'],
      az: ['Hantellər budların qarşısında, dizlər azca bükük.', 'Bel düz, kalçadan əyil.', 'Bud arxasını dartılmış hiss et, sonra kalçanı irəli it.'],
    },
  },
  Single_Leg_Glute_Bridge: {
    en: 'Single-leg glute bridge', az: 'Tək ayaqla körpü', compound: false, lower: true, muscles: ['glutes', 'hamstrings'],
    cues: {
      en: ['Lie on your back, one foot planted, other leg up.', 'Drive through the heel and lift hips until body is straight.', 'Squeeze the glute 1 s at the top.'],
      az: ['Arxası üstə uzan, bir ayaq yerdə, digəri havada.', 'Dabanla itələyib kalçanı bədən düz olana qədər qaldır.', 'Yuxarıda sağrını 1 saniyə sıx.'],
    },
  },
  Barbell_Hip_Thrust: {
    en: 'Barbell hip thrust', az: 'Ştanqla hip thrust', compound: true, lower: true, muscles: ['glutes', 'hamstrings'],
    cues: {
      en: ['Upper back on a bench, bar over hips (use a pad).', 'Chin tucked, drive hips up until torso is level.', 'Squeeze glutes hard at the top; don’t arch the lower back.'],
      az: ['Kürəyin yuxarısı skamyada, ştanq kalçanın üstündə (yastıqla).', 'Çənə aşağı, gövdə düz olana qədər kalçanı qaldır.', 'Yuxarıda sağrını bərk sıx; beli əymə.'],
    },
  },
  Dumbbell_Lunges: {
    en: 'Dumbbell lunge', az: 'Hantellə lunge', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Step forward, both knees bend to ~90°.', 'Torso upright, front knee over the foot.', 'Push back to start; alternate legs.'],
      az: ['İrəli addım at, hər iki diz ~90° bükülür.', 'Gövdə dik, ön diz pəncənin üstündə.', 'Geri itələyib başlanğıca qayıt; ayaqları növbələ.'],
    },
  },
  Bodyweight_Walking_Lunge: {
    en: 'Walking lunge', az: 'Yeriyərək lunge', compound: true, lower: true, muscles: ['quads', 'glutes'],
    cues: {
      en: ['Long steps forward, back knee nearly touches the floor.', 'Keep your torso tall.', 'Hold water bottles or a backpack to add load.'],
      az: ['Uzun addımlarla irəli, arxa diz yerə az qalsın.', 'Gövdəni dik saxla.', 'Yük üçün su butulkaları və ya çanta tut.'],
    },
  },
  Leg_Extensions: {
    en: 'Leg extension', az: 'Ayaq açma (trenajor)', compound: false, lower: true, muscles: ['quads'],
    cues: {
      en: ['Knee joint aligned with the machine pivot.', 'Extend fully, squeeze the quads for 1 s.', 'Lower slowly (2–3 s).'],
      az: ['Diz oynağı trenajorun dönmə oxu ilə bir xətdə.', 'Tam aç, bud önünü 1 saniyə sıx.', 'Yavaş endir (2–3 saniyə).'],
    },
  },
  Lying_Leg_Curls: {
    en: 'Lying leg curl', az: 'Uzanaraq ayaq bükmə', compound: false, lower: true, muscles: ['hamstrings'],
    cues: {
      en: ['Hips pressed into the pad.', 'Curl the pad toward your glutes.', 'Control the way down; don’t let the weight drop.'],
      az: ['Kalça oturacağa sıxılı.', 'Yastığı sağrına doğru bük.', 'Enişi idarə et; çəkini buraxma.'],
    },
  },
  Standing_Calf_Raises: {
    en: 'Standing calf raise', az: 'Ayaq üstə baldır qaldırma', compound: false, lower: true, muscles: ['calves'],
    cues: {
      en: ['Balls of the feet on the edge.', 'Full stretch at the bottom (pause 1–2 s).', 'Rise as high as possible.'],
      az: ['Pəncənin ön hissəsi kənarda.', 'Aşağıda tam dartıl (1–2 saniyə dayan).', 'Bacardığın qədər yuxarı qalx.'],
    },
  },
  Calf_Raise_On_A_Dumbbell: {
    en: 'Calf raise', az: 'Baldır qaldırma', compound: false, lower: true, muscles: ['calves'],
    cues: {
      en: ['Stand on a step or plate, hold support for balance.', 'Pause at the bottom stretch.', 'Go one leg at a time to make it harder.'],
      az: ['Pilləkən və ya disk üstündə dur, tarazlıq üçün tutun.', 'Aşağıda dartılmada dayan.', 'Çətinləşdirmək üçün tək ayaqla et.'],
    },
  },
  'Barbell_Bench_Press_-_Medium_Grip': {
    en: 'Barbell bench press', az: 'Ştanqla jim (bench press)', compound: true, lower: false, muscles: ['chest', 'triceps', 'shoulders'],
    cues: {
      en: ['Shoulder blades pulled back and down, feet planted.', 'Lower the bar to mid-chest, elbows ~45° from the body.', 'Press up and slightly back.'],
      az: ['Kürək sümükləri geri və aşağı sıxılı, ayaqlar yerdə.', 'Ştanqı sinənin ortasına endir, dirsəklər bədəndən ~45°.', 'Yuxarı və azca geri it.'],
    },
  },
  Dumbbell_Bench_Press: {
    en: 'Dumbbell bench press', az: 'Hantellə jim', compound: true, lower: false, muscles: ['chest', 'triceps', 'shoulders'],
    cues: {
      en: ['Shoulder blades back, dumbbells over the chest.', 'Lower until a good chest stretch, elbows ~45°.', 'Press up, dumbbells come slightly together.'],
      az: ['Kürək sümükləri geri, hantellər sinənin üstündə.', 'Sinədə yaxşı dartılmaya qədər endir, dirsəklər ~45°.', 'Yuxarı it, hantellər azca bir-birinə yaxınlaşır.'],
    },
  },
  Pushups: {
    en: 'Push-up', az: 'Şınav', compound: true, lower: false, muscles: ['chest', 'triceps', 'shoulders'],
    cues: {
      en: ['Hands a bit wider than shoulders, body in one line.', 'Chest to the floor, elbows ~45°.', 'Too easy? Elevate your feet or slow the descent.'],
      az: ['Əllər çiyindən azca geniş, bədən bir xətt.', 'Sinə yerə, dirsəklər ~45°.', 'Asandır? Ayaqları yüksəlt və ya yavaş en.'],
    },
  },
  'Decline_Push-Up': {
    en: 'Feet-elevated push-up', az: 'Ayaqlar yuxarıda şınav', compound: true, lower: false, muscles: ['chest', 'shoulders', 'triceps'],
    cues: {
      en: ['Feet on a bench or bed, hands on the floor.', 'Keep a straight line from head to heels.', 'Targets upper chest and shoulders.'],
      az: ['Ayaqlar skamya və ya çarpayıda, əllər yerdə.', 'Başdan dabana düz xətt saxla.', 'Sinənin yuxarısı və çiyinlər işləyir.'],
    },
  },
  Incline_Dumbbell_Press: {
    en: 'Incline dumbbell press', az: 'Maili hantel jimi', compound: true, lower: false, muscles: ['chest', 'shoulders', 'triceps'],
    cues: {
      en: ['Bench at 30–45°.', 'Lower to upper chest with a deep stretch.', 'Press up without bouncing.'],
      az: ['Skamya 30–45° maili.', 'Sinənin yuxarısına dərin dartılma ilə endir.', 'Sıçratmadan yuxarı it.'],
    },
  },
  Standing_Military_Press: {
    en: 'Overhead press', az: 'Başüstü pres (ştanq)', compound: true, lower: false, muscles: ['shoulders', 'triceps'],
    cues: {
      en: ['Grip just outside shoulders, glutes and core tight.', 'Press straight up, head moves back then through.', 'Don’t lean back excessively.'],
      az: ['Tutuş çiyindən azca geniş, sağrı və qarın sıx.', 'Düz yuxarı it, baş geri çəkilib sonra irəli keçir.', 'Həddindən çox arxaya əyilmə.'],
    },
  },
  Seated_Dumbbell_Press: {
    en: 'Seated dumbbell shoulder press', az: 'Oturaq hantel çiyin presi', compound: true, lower: false, muscles: ['shoulders', 'triceps'],
    cues: {
      en: ['Back supported, dumbbells at ear level.', 'Press up until arms are nearly straight.', 'Lower under control to ear level.'],
      az: ['Bel söykənəcəkdə, hantellər qulaq səviyyəsində.', 'Qollar demək olar düz olana qədər yuxarı it.', 'Nəzarətlə qulaq səviyyəsinə endir.'],
    },
  },
  Cable_Crossover: {
    en: 'Cable fly', az: 'Kabel kroşover', compound: false, lower: false, muscles: ['chest'],
    cues: {
      en: ['Slight bend in the elbows, fixed throughout.', 'Bring hands together in a hugging arc.', 'Return slowly to a deep chest stretch.'],
      az: ['Dirsəklər azca bükük və sabit.', 'Əlləri qucaqlayırmış kimi qövslə birləşdir.', 'Yavaşca dərin sinə dartılmasına qayıt.'],
    },
  },
  Dumbbell_Flyes: {
    en: 'Dumbbell fly', az: 'Hantellə sinə açma', compound: false, lower: false, muscles: ['chest'],
    cues: {
      en: ['Elbows slightly bent, open the arms wide.', 'Stop at a comfortable stretch, no shoulder pain.', 'Squeeze the chest to bring them up.'],
      az: ['Dirsəklər azca bükük, qolları geniş aç.', 'Rahat dartılmada dayan, çiyin ağrısı olmasın.', 'Sinəni sıxıb yuxarı gətir.'],
    },
  },
  'Wide-Grip_Lat_Pulldown': {
    en: 'Lat pulldown', az: 'Yuxarı blokdan çəkiş', compound: true, lower: false, muscles: ['back', 'biceps'],
    cues: {
      en: ['Grip a bit wider than shoulders, chest up.', 'Pull the bar to your upper chest, elbows down and back.', 'Full stretch at the top on every rep.'],
      az: ['Tutuş çiyindən azca geniş, sinə irəli.', 'Çubuğu sinənin yuxarısına çək, dirsəklər aşağı və geri.', 'Hər təkrarda yuxarıda tam dartıl.'],
    },
  },
  Pullups: {
    en: 'Pull-up', az: 'Turnik (pull-up)', compound: true, lower: false, muscles: ['back', 'biceps'],
    cues: {
      en: ['Start from a dead hang, shoulders engaged.', 'Pull your chest toward the bar.', 'Can’t do one yet? Use a band or do slow negatives.'],
      az: ['Tam asılı vəziyyətdən başla, çiyinlər aktiv.', 'Sinəni turnikə doğru çək.', 'Hələ bacarmırsan? Rezin kəmər və ya yavaş enişlər et.'],
    },
  },
  Seated_Cable_Rows: {
    en: 'Seated cable row', az: 'Oturaq kabel çəkişi', compound: true, lower: false, muscles: ['back', 'biceps'],
    cues: {
      en: ['Chest tall, slight forward lean at the start.', 'Pull the handle to your stomach, squeeze shoulder blades.', 'Let the shoulders stretch forward on the way back.'],
      az: ['Sinə dik, başlanğıcda azca irəli əyil.', 'Dəstəyi qarnına çək, kürək sümüklərini sıx.', 'Qayıdanda çiyinlər irəli dartılsın.'],
    },
  },
  'One-Arm_Dumbbell_Row': {
    en: 'One-arm dumbbell row', az: 'Tək əllə hantel çəkişi', compound: true, lower: false, muscles: ['back', 'biceps'],
    cues: {
      en: ['Hand and knee on a bench, back flat.', 'Pull the dumbbell toward your hip.', 'Lower to a full stretch.'],
      az: ['Əl və diz skamyada, bel düz.', 'Hanteli kalçana doğru çək.', 'Tam dartılmaya qədər endir.'],
    },
  },
  Inverted_Row: {
    en: 'Inverted row', az: 'Tərs çəkiş', compound: true, lower: false, muscles: ['back', 'biceps'],
    cues: {
      en: ['Lie under a sturdy table or low bar, body straight.', 'Pull your chest to the edge.', 'Bend knees to make it easier.'],
      az: ['Möhkəm masa və ya alçaq turnikin altında uzan, bədən düz.', 'Sinəni kənara çək.', 'Asanlaşdırmaq üçün dizləri bük.'],
    },
  },
  Side_Lateral_Raise: {
    en: 'Lateral raise', az: 'Yana qaldırma', compound: false, lower: false, muscles: ['shoulders'],
    cues: {
      en: ['Slight lean forward, lead with the elbows.', 'Raise to shoulder height, no swinging.', 'Light weight, slow lowering.'],
      az: ['Azca irəli əyil, hərəkəti dirsəklər aparsın.', 'Çiyin səviyyəsinə qaldır, yellənmə.', 'Yüngül çəki, yavaş eniş.'],
    },
  },
  Face_Pull: {
    en: 'Face pull', az: 'Üzə çəkiş', compound: false, lower: false, muscles: ['shoulders', 'back'],
    cues: {
      en: ['Rope at face height.', 'Pull to your forehead, elbows high, hands apart.', 'Great for posture and shoulder health.'],
      az: ['Kəndir üz hündürlüyündə.', 'Alnına çək, dirsəklər yuxarı, əllər aralı.', 'Duruş və çiyin sağlamlığı üçün əladır.'],
    },
  },
  Reverse_Flyes: {
    en: 'Rear-delt fly', az: 'Arxa çiyin açma', compound: false, lower: false, muscles: ['shoulders', 'back'],
    cues: {
      en: ['Hinge forward, back flat.', 'Open arms out to the sides.', 'Think “hands go wide”, not “squeeze back”.'],
      az: ['İrəli əyil, bel düz.', 'Qolları yanlara aç.', '“Kürəyi sıx” yox, “əllər genişə” düşün.'],
    },
  },
  Dumbbell_Bicep_Curl: {
    en: 'Dumbbell curl', az: 'Hantellə biseps', compound: false, lower: false, muscles: ['biceps'],
    cues: {
      en: ['Elbows pinned at your sides.', 'Curl up and turn the pinky up slightly.', 'Lower slowly to full extension.'],
      az: ['Dirsəklər yanlara yapışıq.', 'Qaldır və çeçələ barmağı azca yuxarı çevir.', 'Tam açılana qədər yavaş endir.'],
    },
  },
  Hammer_Curls: {
    en: 'Hammer curl', az: 'Çəkic biseps', compound: false, lower: false, muscles: ['biceps'],
    cues: {
      en: ['Palms face each other.', 'Curl without swinging the torso.', 'Builds arm thickness (brachialis).'],
      az: ['Ovuclar bir-birinə baxır.', 'Gövdəni yellətmədən qaldır.', 'Qolun qalınlığını artırır (brachialis).'],
    },
  },
  'Chin-Up': {
    en: 'Chin-up', az: 'Dar tutuşla turnik', compound: true, lower: false, muscles: ['back', 'biceps'],
    cues: {
      en: ['Palms facing you, shoulder-width.', 'Pull until chin clears the bar.', 'Hits biceps hard as well as the back.'],
      az: ['Ovuclar sənə baxır, çiyin genişliyində.', 'Çənə turnikdən yuxarı olana qədər çək.', 'Kürəklə yanaşı bisepsi güclü işlədir.'],
    },
  },
  Triceps_Pushdown: {
    en: 'Triceps pushdown', az: 'Triseps aşağı itələmə', compound: false, lower: false, muscles: ['triceps'],
    cues: {
      en: ['Elbows fixed at your sides.', 'Push down until arms are straight.', 'Control the return.'],
      az: ['Dirsəklər yanlarda sabit.', 'Qollar düz olana qədər aşağı it.', 'Qayıdışı idarə et.'],
    },
  },
  'Dumbbell_One-Arm_Triceps_Extension': {
    en: 'Overhead dumbbell extension', az: 'Başüstü hantel triseps', compound: false, lower: false, muscles: ['triceps'],
    cues: {
      en: ['Dumbbell overhead, elbow pointing up.', 'Lower behind your head for a deep stretch.', 'Extend fully; long-head stretch builds size.'],
      az: ['Hantel başın üstündə, dirsək yuxarı.', 'Dərin dartılma üçün başın arxasına endir.', 'Tam aç; uzun başın dartılması həcm artırır.'],
    },
  },
  Bench_Dips: {
    en: 'Bench dip', az: 'Skamyada dips', compound: false, lower: false, muscles: ['triceps'],
    cues: {
      en: ['Hands on a bench behind you, legs forward.', 'Bend elbows to ~90°, shoulders down.', 'Push back up.'],
      az: ['Əllər arxadakı skamyada, ayaqlar irəlidə.', 'Dirsəkləri ~90° bük, çiyinlər aşağı.', 'Geri yuxarı it.'],
    },
  },
  Triceps_Overhead_Extension_with_Rope: {
    en: 'Overhead cable extension', az: 'Başüstü kabel triseps', compound: false, lower: false, muscles: ['triceps'],
    cues: {
      en: ['Face away from the cable, rope behind your head.', 'Extend arms forward and up.', 'Deep stretch at the start of each rep.'],
      az: ['Kabelə arxa çevir, kəndir başın arxasında.', 'Qolları irəli və yuxarı aç.', 'Hər təkrarın əvvəlində dərin dartılma.'],
    },
  },
  Hanging_Leg_Raise: {
    en: 'Hanging leg raise', az: 'Asılı ayaq qaldırma', compound: false, lower: false, muscles: ['abs'],
    cues: {
      en: ['Hang from a bar, no swinging.', 'Curl your pelvis up as you raise the legs.', 'Bend knees to make it easier.'],
      az: ['Turnikdən asıl, yellənmə.', 'Ayaqları qaldırarkən çanağı yuxarı bük.', 'Asanlaşdırmaq üçün dizləri bük.'],
    },
  },
  Crunches: {
    en: 'Crunch', az: 'Krunç (qarın)', compound: false, lower: false, muscles: ['abs'],
    cues: {
      en: ['Lower back on the floor.', 'Curl ribs toward hips, don’t pull your neck.', 'Exhale at the top.'],
      az: ['Belin aşağısı yerdə.', 'Qabırğaları kalçaya doğru bük, boynu dartma.', 'Yuxarıda nəfəs ver.'],
    },
  },
  Plank: {
    en: 'Plank', az: 'Plank', compound: false, lower: false, muscles: ['abs'], timed: true,
    cues: {
      en: ['Forearms under shoulders, body straight.', 'Squeeze glutes and brace like taking a punch.', 'Stop when your hips start to sag.'],
      az: ['Qolüstlər çiyinlərin altında, bədən düz.', 'Sağrını sıx, qarını zərbə gözləyirmiş kimi gər.', 'Kalça aşağı düşməyə başlayanda dayan.'],
    },
  },
};

export function exerciseName(id: string, lang: Lang): string {
  const e = EXERCISES[id];
  return e ? (lang === 'az' ? e.az : e.en) : id.replace(/_/g, ' ');
}

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
export function exerciseImages(id: string): [string, string] {
  return [`${IMG_BASE}/${id}/0.jpg`, `${IMG_BASE}/${id}/1.jpg`];
}

// ---------- movement slots ----------
type Slot =
  | 'squat' | 'squatAlt' | 'hinge' | 'glute' | 'quadIso' | 'hamIso' | 'calves'
  | 'hPush' | 'inclinePush' | 'vPush' | 'chestIso' | 'vPull' | 'hPull' | 'hPull2'
  | 'sideDelt' | 'rearDelt' | 'biceps' | 'biceps2' | 'triceps' | 'tricepsOH' | 'core';

/** [gym, dumbbells, bodyweight]; null = no good option, slot is skipped. */
const SLOTS: Record<Slot, [string | null, string | null, string | null]> = {
  squat: ['Barbell_Squat', 'Goblet_Squat', 'Bodyweight_Squat'],
  squatAlt: ['Leg_Press', 'Split_Squat_with_Dumbbells', 'Split_Squats'],
  hinge: ['Romanian_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  glute: ['Barbell_Hip_Thrust', 'Dumbbell_Lunges', 'Bodyweight_Walking_Lunge'],
  quadIso: ['Leg_Extensions', null, null],
  hamIso: ['Lying_Leg_Curls', null, null],
  calves: ['Standing_Calf_Raises', 'Calf_Raise_On_A_Dumbbell', 'Calf_Raise_On_A_Dumbbell'],
  hPush: ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Pushups'],
  inclinePush: ['Incline_Dumbbell_Press', 'Incline_Dumbbell_Press', 'Decline_Push-Up'],
  vPush: ['Standing_Military_Press', 'Seated_Dumbbell_Press', 'Decline_Push-Up'],
  chestIso: ['Cable_Crossover', 'Dumbbell_Flyes', null],
  vPull: ['Wide-Grip_Lat_Pulldown', 'Pullups', 'Pullups'],
  hPull: ['Seated_Cable_Rows', 'One-Arm_Dumbbell_Row', 'Inverted_Row'],
  hPull2: ['One-Arm_Dumbbell_Row', 'One-Arm_Dumbbell_Row', 'Inverted_Row'],
  sideDelt: ['Side_Lateral_Raise', 'Side_Lateral_Raise', null],
  rearDelt: ['Face_Pull', 'Reverse_Flyes', null],
  // bodyweight: pull-ups already load the biceps heavily, a chin-up on the same day would be redundant
  biceps: ['Dumbbell_Bicep_Curl', 'Dumbbell_Bicep_Curl', null],
  biceps2: ['Hammer_Curls', 'Hammer_Curls', null],
  triceps: ['Triceps_Pushdown', 'Dumbbell_One-Arm_Triceps_Extension', 'Bench_Dips'],
  tricepsOH: ['Triceps_Overhead_Extension_with_Rope', 'Dumbbell_One-Arm_Triceps_Extension', null],
  core: ['Hanging_Leg_Raise', 'Crunches', 'Plank'],
};

type DayKind = 'fullA' | 'fullB' | 'fullC' | 'upperA' | 'lowerA' | 'upperB' | 'lowerB' | 'push' | 'pull' | 'legs';

const DAY_SLOTS: Record<DayKind, Slot[]> = {
  fullA: ['squat', 'hPush', 'vPull', 'hinge', 'sideDelt', 'biceps', 'core'],
  fullB: ['hinge', 'vPush', 'hPull', 'squatAlt', 'triceps', 'calves', 'core'],
  fullC: ['squatAlt', 'inclinePush', 'vPull', 'glute', 'rearDelt', 'biceps', 'triceps'],
  // arms alternate between the two upper days so both get direct work even in short sessions
  upperA: ['hPush', 'vPull', 'inclinePush', 'hPull', 'sideDelt', 'triceps', 'biceps'],
  lowerA: ['squat', 'hinge', 'quadIso', 'hamIso', 'calves', 'core'],
  upperB: ['vPush', 'hPull', 'vPull', 'chestIso', 'biceps2', 'tricepsOH', 'sideDelt', 'rearDelt'],
  lowerB: ['squatAlt', 'glute', 'hamIso', 'quadIso', 'calves', 'core'],
  push: ['hPush', 'vPush', 'inclinePush', 'sideDelt', 'triceps', 'tricepsOH'],
  pull: ['vPull', 'hPull', 'hPull2', 'rearDelt', 'biceps', 'biceps2'],
  legs: ['squat', 'hinge', 'squatAlt', 'hamIso', 'calves', 'core'],
};

export const DAY_TITLES: Record<Lang, Record<DayKind, string>> = {
  en: { fullA: 'Full body A', fullB: 'Full body B', fullC: 'Full body C', upperA: 'Upper A', lowerA: 'Lower A', upperB: 'Upper B', lowerB: 'Lower B', push: 'Push', pull: 'Pull', legs: 'Legs' },
  az: { fullA: 'Tam bədən A', fullB: 'Tam bədən B', fullC: 'Tam bədən C', upperA: 'Üst A', lowerA: 'Alt A', upperB: 'Üst B', lowerB: 'Alt B', push: 'İtələmə', pull: 'Çəkmə', legs: 'Ayaq' },
};

export type Split = 'full' | 'ul' | 'ulppl' | 'ppl';
export type TrainingGoal = 'muscle' | 'strength' | 'fitness';
export type Limitation = 'knees' | 'lowerBack' | 'shoulders';

export interface ProgramOptions {
  equipment: Equipment;
  goal: TrainingGoal;
  /** Muscles to prioritise (max 3). */
  priorities: Muscle[];
  limitations: Limitation[];
  /** Chosen training weekdays (0 = Monday). Defaults to an evenly spread schedule. */
  weekdays?: number[];
}

/** Evenly spread default schedule for n training days (rest days between sessions where possible). */
export function defaultWeekdays(n: number): number[] {
  return WEEKDAYS_BY_COUNT[Math.min(6, Math.max(1, n))] ?? [0, 2, 4];
}

export interface PlannedExercise {
  id: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSec: number;
  /** Added or boosted because the user prioritised this muscle. */
  priority?: boolean;
}

export interface ProgramDay {
  key: string;
  kind: DayKind;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  exercises: PlannedExercise[];
}

export interface Program {
  version: 2;
  createdAt: number;
  options: ProgramOptions;
  equipment: Equipment;
  split: Split;
  days: ProgramDay[];
  /** Typical hard sets per muscle per week for this level. */
  setsPerMuscle: number;
  /** Actual weekly sets per muscle in this program (primary = 1, secondary = 0.5). */
  weeklySets: Record<Muscle, number>;
}

const WEEKDAYS_BY_COUNT: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

const SPLITS: Record<number, { split: Split; kinds: DayKind[] }> = {
  1: { split: 'full', kinds: ['fullA'] },
  2: { split: 'full', kinds: ['fullA', 'fullB'] },
  3: { split: 'full', kinds: ['fullA', 'fullB', 'fullC'] },
  4: { split: 'ul', kinds: ['upperA', 'lowerA', 'upperB', 'lowerB'] },
  5: { split: 'ulppl', kinds: ['upperA', 'lowerA', 'push', 'pull', 'legs'] },
  6: { split: 'ppl', kinds: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
};

const MAX_EXERCISES: Record<number, number> = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

/**
 * Joint-friendly substitutes. Knees: less deep knee flexion under load; lower back: no heavy spinal
 * loading; shoulders: no overhead pressing, deep dips or deep flyes.
 */
const SUBSTITUTE: Record<Limitation, Record<string, string | null>> = {
  // Quads are still trained (strong quads protect the knee), but with stable, controllable machines
  // and a pain-free range instead of deep loaded squats and lunges.
  knees: {
    Barbell_Squat: 'Leg_Press',
    Split_Squat_with_Dumbbells: 'Goblet_Squat',
    Split_Squats: 'Bodyweight_Squat',
    Dumbbell_Lunges: 'Single_Leg_Glute_Bridge',
    Bodyweight_Walking_Lunge: 'Single_Leg_Glute_Bridge',
  },
  lowerBack: {
    Barbell_Squat: 'Leg_Press',
    Romanian_Deadlift: 'Lying_Leg_Curls',
    'Stiff-Legged_Dumbbell_Deadlift': 'Single_Leg_Glute_Bridge',
    Standing_Military_Press: 'Seated_Dumbbell_Press',
    Hanging_Leg_Raise: 'Plank',
  },
  shoulders: {
    Standing_Military_Press: 'Incline_Dumbbell_Press',
    Seated_Dumbbell_Press: 'Incline_Dumbbell_Press',
    'Decline_Push-Up': 'Pushups',
    'Barbell_Bench_Press_-_Medium_Grip': 'Dumbbell_Bench_Press',
    Bench_Dips: 'Triceps_Pushdown',
    Dumbbell_Flyes: null,
    Cable_Crossover: null,
  },
};

/** Extra exercise per prioritised muscle: [gym, dumbbells, bodyweight]. */
const PRIORITY_EXTRA: Record<Muscle, [string | null, string | null, string | null]> = {
  chest: ['Cable_Crossover', 'Dumbbell_Flyes', 'Decline_Push-Up'],
  back: ['One-Arm_Dumbbell_Row', 'One-Arm_Dumbbell_Row', 'Inverted_Row'],
  shoulders: ['Side_Lateral_Raise', 'Side_Lateral_Raise', 'Decline_Push-Up'],
  quads: ['Leg_Extensions', 'Split_Squat_with_Dumbbells', 'Split_Squats'],
  hamstrings: ['Lying_Leg_Curls', 'Stiff-Legged_Dumbbell_Deadlift', 'Single_Leg_Glute_Bridge'],
  glutes: ['Barbell_Hip_Thrust', 'Single_Leg_Glute_Bridge', 'Single_Leg_Glute_Bridge'],
  calves: ['Standing_Calf_Raises', 'Calf_Raise_On_A_Dumbbell', 'Calf_Raise_On_A_Dumbbell'],
  biceps: ['Hammer_Curls', 'Hammer_Curls', 'Chin-Up'],
  triceps: ['Triceps_Overhead_Extension_with_Rope', 'Dumbbell_One-Arm_Triceps_Extension', 'Bench_Dips'],
  abs: ['Hanging_Leg_Raise', 'Crunches', 'Plank'],
};

export const ALL_MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

function applyLimits(id: string, limits: Limitation[]): string | null {
  let cur: string | null = id;
  for (let pass = 0; pass < 3 && cur; pass++) {
    let changed = false;
    for (const l of limits) {
      if (cur && cur in SUBSTITUTE[l]) {
        cur = SUBSTITUTE[l][cur];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return cur;
}

export function generateProgram(profile: Profile, options: ProgramOptions): Program | null {
  const chosen0 = options.weekdays?.length ? [...new Set(options.weekdays)].sort((a, b) => a - b).slice(0, 6) : null;
  const days = chosen0 ? chosen0.length : Math.min(6, Math.max(0, profile.trainingDays));
  if (days === 0) return null;
  const weekdays = chosen0 ?? WEEKDAYS_BY_COUNT[days];
  const { split, kinds } = SPLITS[days];
  const { equipment, goal, priorities, limitations } = options;
  const eqIdx = equipment === 'gym' ? 0 : equipment === 'dumbbells' ? 1 : 2;
  const maxEx = MAX_EXERCISES[profile.sessionMin] ?? 6;
  const exp: Experience = profile.experience;
  const older = profile.age >= 50;
  const teen = profile.age < 18;
  const hitsPriority = (id: string) => priorities.includes(EXERCISES[id]?.muscles[0] as Muscle);

  const plan = kinds.map((kind, i): ProgramDay => {
    const ids: string[] = [];
    for (const slot of DAY_SLOTS[kind]) {
      const raw = SLOTS[slot][eqIdx];
      const id = raw ? applyLimits(raw, limitations) : null;
      if (id && !ids.includes(id)) ids.push(id);
    }

    // priority principle: one extra exercise for each prioritised muscle this day already trains
    const dayMuscles = new Set(ids.flatMap((id) => EXERCISES[id]?.muscles ?? []));
    const extras: string[] = [];
    for (const m of priorities) {
      if (!dayMuscles.has(m)) continue;
      const raw = PRIORITY_EXTRA[m][eqIdx];
      const id = raw ? applyLimits(raw, limitations) : null;
      if (id && !ids.includes(id) && !extras.includes(id)) extras.push(id);
    }

    // order: prioritised compounds → other compounds → prioritised isolation → other isolation
    const all = [...ids, ...extras];
    const isPrio = (id: string) => hitsPriority(id) || extras.includes(id);
    const rank = (id: string) => (EXERCISES[id]?.compound ? 0 : 2) + (isPrio(id) ? 0 : 1);
    let chosen = all
      .map((id, idx) => ({ id, idx }))
      .sort((a, b) => rank(a.id) - rank(b.id) || a.idx - b.idx)
      .map((x) => x.id);

    // session-length cap; priority work is never what gets cut
    const cap = maxEx + (extras.length > 0 ? 1 : 0);
    while (chosen.length > cap) {
      let dropAt = chosen.length - 1;
      for (let k = chosen.length - 1; k >= 0; k--) {
        if (!isPrio(chosen[k])) {
          dropAt = k;
          break;
        }
      }
      chosen = chosen.filter((_, k) => k !== dropAt);
    }

    const mainLift = chosen.find((id) => EXERCISES[id]?.compound);
    const exercises = chosen.map((id): PlannedExercise => {
      const info = EXERCISES[id];
      const compound = info?.compound ?? false;
      const prio = isPrio(id);
      const isMain = id === mainLift;
      // sets: trained lifters need more volume; frequency 2×/wk keeps per-session sets moderate
      let sets = compound ? (exp === 'advanced' ? 4 : 3) : exp === 'beginner' ? 2 : 3;
      // reps: heavier ranges for compounds; teens, 50+ and beginners use moderate loads
      const heavyOk = !older && !teen && exp !== 'beginner';
      let [repMin, repMax] = compound ? (heavyOk ? [6, 10] : [8, 12]) : [10, 15];
      let restSec = compound ? (info?.lower ? 180 : 150) : 75;
      if (goal === 'strength' && isMain) {
        // strength: the day's main lift goes heavy; assistance work stays in the hypertrophy range
        [repMin, repMax] = heavyOk ? [4, 6] : [6, 8];
        sets = Math.max(sets, 4);
        restSec = 210;
      }
      if (goal === 'fitness') {
        sets = Math.max(2, sets - 1);
        [repMin, repMax] = compound ? [10, 12] : [12, 15];
        restSec = compound ? 90 : 60;
      }
      if (prio && goal !== 'fitness') sets += 1; // specialisation: more weekly volume for weak points
      if (info?.timed) [repMin, repMax] = [30, 60];
      return { id, sets, repMin, repMax, restSec, priority: prio };
    });
    return { key: `${kind}-${i}`, kind, weekday: weekdays[i], exercises };
  });

  const weeklySets = Object.fromEntries(ALL_MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const d of plan)
    for (const e of d.exercises)
      (EXERCISES[e.id]?.muscles ?? []).forEach((m, idx) => {
        weeklySets[m] += idx === 0 ? e.sets : e.sets / 2;
      });

  const setsPerMuscle = exp === 'beginner' ? 10 : exp === 'intermediate' ? 14 : 18;
  return { version: 2, createdAt: Date.now(), options, equipment, split, days: plan, setsPerMuscle, weeklySets };
}

type Mistakes = { en: string[]; az: string[] };
const m = (en: string[], az: string[]): Mistakes => ({ en, az });

/** Most common technique errors, written for beginners. */
export const MISTAKES: Record<string, Mistakes> = {
  Barbell_Squat: m(
    ['Knees caving inward on the way up.', 'Heels lifting / weight shifting onto the toes.', 'Rounding the lower back at the bottom ("butt wink") with heavy load.'],
    ['Qalxanda dizlərin içəri düşməsi.', 'Dabanların qalxması, çəkinin barmaqlara keçməsi.', 'Ağır çəkidə aşağıda belin yumrulanması.'],
  ),
  Goblet_Squat: m(['Chest collapsing forward.', 'Going only a quarter of the way down.'], ['Sinənin irəli yıxılması.', 'Yalnız dörddə bir qədər enmək.']),
  Bodyweight_Squat: m(['Rushing reps with no control.', 'Knees caving in.'], ['Təkrarları nəzarətsiz tələsik etmək.', 'Dizlərin içəri düşməsi.']),
  Leg_Press: m(
    ['Lowering so deep that the lower back lifts off the pad.', 'Locking the knees hard at the top.'],
    ['Bel oturacaqdan qalxacaq qədər dərin endirmək.', 'Yuxarıda dizləri sərt kilidləmək.'],
  ),
  Split_Squat_with_Dumbbells: m(['Stance too short, front heel lifts.', 'Pushing off the back leg.'], ['Addım çox qısa, ön daban qalxır.', 'Arxa ayaqla itələmək.']),
  Split_Squats: m(['Stance too short.', 'Leaning far forward.'], ['Addım çox qısa.', 'Çox irəli əyilmək.']),
  Romanian_Deadlift: m(
    ['Rounding the back to reach lower.', 'Squatting the weight down instead of pushing the hips back.', 'Bar drifting away from the legs.'],
    ['Daha aşağı enmək üçün beli yumrulamaq.', 'Kalçanı arxaya itmək əvəzinə squat kimi oturmaq.', 'Ştanqın ayaqlardan uzaqlaşması.'],
  ),
  'Stiff-Legged_Dumbbell_Deadlift': m(['Rounding the back.', 'Locking the knees completely.'], ['Beli yumrulamaq.', 'Dizləri tam kilidləmək.']),
  Single_Leg_Glute_Bridge: m(['Arching the lower back instead of using glutes.', 'Hips rotating to one side.'], ['Sağrı əvəzinə beli əymək.', 'Kalçanın bir tərəfə dönməsi.']),
  Barbell_Hip_Thrust: m(['Over-arching the lower back at the top.', 'Feet too far, hamstrings take over.'], ['Yuxarıda beli həddindən çox əymək.', 'Ayaqlar çox uzaqda, işi bud arxası görür.']),
  Dumbbell_Lunges: m(['Front knee caving in.', 'Steps too short.'], ['Ön dizin içəri düşməsi.', 'Addımların çox qısa olması.']),
  Bodyweight_Walking_Lunge: m(['Torso leaning forward.', 'Back knee slamming the floor.'], ['Gövdənin irəli əyilməsi.', 'Arxa dizin yerə dəyməsi.']),
  Leg_Extensions: m(['Swinging the weight up.', 'Hips lifting off the seat.'], ['Çəkini yelləyib qaldırmaq.', 'Kalçanın oturacaqdan qalxması.']),
  Lying_Leg_Curls: m(['Hips lifting off the pad.', 'Dropping the weight fast.'], ['Kalçanın yastıqdan qalxması.', 'Çəkini sürətlə buraxmaq.']),
  Standing_Calf_Raises: m(['Bouncing with no pause or stretch.', 'Half reps.'], ['Dayanmadan, dartılmadan sıçramaq.', 'Yarım təkrarlar.']),
  Calf_Raise_On_A_Dumbbell: m(['Bouncing quickly.', 'Too small a range of motion.'], ['Tez-tez sıçramaq.', 'Çox kiçik hərəkət amplitudası.']),
  'Barbell_Bench_Press_-_Medium_Grip': m(
    ['Elbows flared 90° out (shoulder stress).', 'Bouncing the bar off the chest.', 'Butt lifting off the bench.'],
    ['Dirsəkləri 90° yana açmaq (çiyinə yük).', 'Ştanqı sinədən sıçratmaq.', 'Sağrının skamyadan qalxması.'],
  ),
  Dumbbell_Bench_Press: m(['Elbows flared to 90°.', 'Lowering only halfway.'], ['Dirsəkləri 90° yana açmaq.', 'Yalnız yarıya qədər endirmək.']),
  Pushups: m(['Hips sagging.', 'Elbows flared wide; half reps.'], ['Kalçanın aşağı düşməsi.', 'Dirsəkləri geniş açmaq; yarım təkrarlar.']),
  'Decline_Push-Up': m(['Hips piking up.', 'Head dropping toward the floor.'], ['Kalçanın yuxarı qalxması.', 'Başın yerə sallanması.']),
  Incline_Dumbbell_Press: m(['Bench too steep (becomes a shoulder press).', 'Short range of motion.'], ['Skamya çox dik (çiyin presinə çevrilir).', 'Qısa hərəkət amplitudası.']),
  Standing_Military_Press: m(['Leaning back excessively.', 'Pressing forward instead of straight up.'], ['Həddindən çox arxaya əyilmək.', 'Düz yuxarı yox, irəli itələmək.']),
  Seated_Dumbbell_Press: m(['Arching the back off the pad.', 'Dumbbells drifting forward.'], ['Beli söykənəcəkdən əymək.', 'Hantellərin irəli getməsi.']),
  Cable_Crossover: m(['Bending the elbows into a press.', 'Too heavy, torso swings.'], ['Dirsəkləri bükərək presə çevirmək.', 'Çəki ağır, gövdə yellənir.']),
  Dumbbell_Flyes: m(['Going too deep, shoulder pain.', 'Straight arms (elbow stress).'], ['Çox dərin enmək, çiyin ağrısı.', 'Qolları tam düz saxlamaq (dirsəyə yük).']),
  'Wide-Grip_Lat_Pulldown': m(['Leaning far back and rowing.', 'Pulling behind the neck.'], ['Çox arxaya əyilib çəkmək.', 'Boynun arxasına çəkmək.']),
  Pullups: m(['Kipping/swinging.', 'Half reps without a dead hang.'], ['Yellənib qalxmaq.', 'Tam asılmadan yarım təkrarlar.']),
  Seated_Cable_Rows: m(['Rocking the torso to move the weight.', 'Shrugging the shoulders up.'], ['Çəkini gövdəni yelləyərək hərəkət etdirmək.', 'Çiyinləri yuxarı çəkmək.']),
  'One-Arm_Dumbbell_Row': m(['Twisting the torso.', 'Pulling to the chest instead of the hip.'], ['Gövdəni burmaq.', 'Kalçaya yox, sinəyə çəkmək.']),
  Inverted_Row: m(['Hips sagging.', 'Not touching the bar/edge.'], ['Kalçanın aşağı düşməsi.', 'Kənara/turnikə toxunmamaq.']),
  Side_Lateral_Raise: m(['Swinging heavy dumbbells.', 'Raising above shoulder height with shrugging.'], ['Ağır hantelləri yelləmək.', 'Çiyni çəkərək çiyindən yuxarı qaldırmaq.']),
  Face_Pull: m(['Too heavy, leaning back.', 'Elbows dropping low.'], ['Çox ağır, arxaya əyilmək.', 'Dirsəklərin aşağı düşməsi.']),
  Reverse_Flyes: m(['Squeezing shoulder blades (turns into a row).', 'Swinging.'], ['Kürək sümüklərini sıxmaq (çəkişə çevrilir).', 'Yellənmək.']),
  Dumbbell_Bicep_Curl: m(['Swinging the torso.', 'Elbows moving forward.'], ['Gövdəni yelləmək.', 'Dirsəklərin irəli getməsi.']),
  Hammer_Curls: m(['Swinging.', 'Partial reps.'], ['Yellənmək.', 'Natamam təkrarlar.']),
  'Chin-Up': m(['Swinging.', 'Not going all the way down.'], ['Yellənmək.', 'Tam aşağı enməmək.']),
  Triceps_Pushdown: m(['Elbows drifting forward.', 'Leaning over the weight.'], ['Dirsəklərin irəli getməsi.', 'Çəkinin üstünə əyilmək.']),
  'Dumbbell_One-Arm_Triceps_Extension': m(['Elbow flaring out.', 'Too heavy, no stretch.'], ['Dirsəyin yana açılması.', 'Çox ağır, dartılma yoxdur.']),
  Bench_Dips: m(['Going too deep (shoulder strain).', 'Shoulders shrugging up.'], ['Çox dərin enmək (çiyinə yük).', 'Çiyinlərin yuxarı qalxması.']),
  Triceps_Overhead_Extension_with_Rope: m(['Elbows flaring.', 'Arching the lower back.'], ['Dirsəklərin açılması.', 'Belin əyilməsi.']),
  Hanging_Leg_Raise: m(['Swinging for momentum.', 'Only lifting legs, not curling the pelvis.'], ['Təcil üçün yellənmək.', 'Çanağı bükmədən yalnız ayaqları qaldırmaq.']),
  Crunches: m(['Pulling on the neck.', 'Sitting all the way up (hip flexors take over).'], ['Boynu dartmaq.', 'Tam oturmaq (işi kalça əzələləri görür).']),
  Plank: m(['Hips sagging or piking.', 'Holding your breath.'], ['Kalçanın aşağı düşməsi və ya qalxması.', 'Nəfəsi saxlamaq.']),
};

/** Opens real-person form videos for the exercise (YouTube search, no licensing issues). */
export function videoSearchUrl(id: string): string {
  const q = `${EXERCISES[id]?.en ?? id.replace(/_/g, ' ')} proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** Double progression: all sets at the top of the range → add load; else add reps. */
export function suggestNext(
  planned: PlannedExercise,
  last: { weight: number; reps: number }[] | undefined,
): { weight: number; reps: number } | null {
  if (!last || last.length === 0) return null;
  const top = last.every((s) => s.reps >= planned.repMax);
  const w = Math.max(...last.map((s) => s.weight));
  if (EXERCISES[planned.id]?.timed) return { weight: w, reps: Math.min(planned.repMax + 15, Math.max(...last.map((s) => s.reps)) + 5) };
  if (top) {
    const inc = w === 0 ? 0 : EXERCISES[planned.id]?.lower ? 5 : 2.5;
    return { weight: w + inc, reps: planned.repMin };
  }
  const minReps = Math.min(...last.map((s) => s.reps));
  return { weight: w, reps: Math.min(planned.repMax, minReps + 1) };
}
