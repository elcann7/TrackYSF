import type { MyFoodRow } from './db';
import type { Lang } from './i18n';
import type { Macros } from './nutrition';

export type FoodSource = 'common' | 'mine' | 'online';

export interface Serving {
  label: string;
  grams: number;
}

export interface Food {
  key: string;
  name: string;
  brand?: string;
  /** Nutrition per 100 g (or 100 ml for drinks). */
  per100: Macros;
  unit: 'g' | 'ml';
  servings: Serving[];
  source: FoodSource;
  /** Row id for user-created foods. */
  myId?: number;
  /** Name in the other language, used only for search. */
  alt?: string;
}

/**
 * Typical values per 100 g / 100 ml, mostly USDA FoodData Central; Azerbaijani home dishes are
 * estimates for common home recipes. Tuple: [key, en, az, kcal, protein, carbs, fat, unit, servings]
 * servings: [enLabel, azLabel, grams][]
 */
type Row = [string, string, string, number, number, number, number, 'g' | 'ml', [string, string, number][]];

const ROWS: Row[] = [
  // ---------- fruit ----------
  ['banana', 'Banana', 'Banan', 89, 1.1, 22.8, 0.3, 'g', [['medium', 'orta', 118]]],
  ['apple', 'Apple', 'Alma', 52, 0.3, 13.8, 0.2, 'g', [['medium', 'orta', 182]]],
  ['orange', 'Orange', 'Portağal', 47, 0.9, 11.8, 0.1, 'g', [['medium', 'orta', 131]]],
  ['mandarin', 'Mandarin', 'Naringi', 53, 0.8, 13.3, 0.3, 'g', [['1 pc', '1 ədəd', 88]]],
  ['pear', 'Pear', 'Armud', 57, 0.4, 15.2, 0.1, 'g', [['medium', 'orta', 178]]],
  ['grapes', 'Grapes', 'Üzüm', 69, 0.7, 18.1, 0.2, 'g', [['cup', 'stəkan', 151]]],
  ['watermelon', 'Watermelon', 'Qarpız', 30, 0.6, 7.6, 0.2, 'g', [['slice', 'dilim', 280]]],
  ['melon', 'Melon', 'Yemiş', 34, 0.8, 8.2, 0.2, 'g', [['slice', 'dilim', 160]]],
  ['pomegranate', 'Pomegranate', 'Nar', 83, 1.7, 18.7, 1.2, 'g', [['1 pc', '1 ədəd', 282]]],
  ['persimmon', 'Persimmon', 'Xurma (hurma)', 70, 0.6, 18.6, 0.2, 'g', [['1 pc', '1 ədəd', 168]]],
  ['strawberry', 'Strawberries', 'Çiyələk', 32, 0.7, 7.7, 0.3, 'g', [['cup', 'stəkan', 152]]],
  ['kiwi', 'Kiwi', 'Kivi', 61, 1.1, 14.7, 0.5, 'g', [['1 pc', '1 ədəd', 69]]],
  ['dates', 'Dates', 'Finik', 282, 2.5, 75, 0.4, 'g', [['1 pc', '1 ədəd', 8]]],
  ['raisins', 'Raisins', 'Kişmiş', 299, 3.1, 79.2, 0.5, 'g', [['handful', 'ovuc', 30]]],
  ['dried-apricot', 'Dried apricots', 'Quru ərik (qaysı)', 241, 3.4, 62.6, 0.5, 'g', [['1 pc', '1 ədəd', 8]]],
  ['lemon', 'Lemon', 'Limon', 29, 1.1, 9.3, 0.3, 'g', [['slice', 'dilim', 8]]],

  // ---------- vegetables ----------
  ['tomato', 'Tomato', 'Pomidor', 18, 0.9, 3.9, 0.2, 'g', [['medium', 'orta', 123]]],
  ['cucumber', 'Cucumber', 'Xiyar', 15, 0.7, 3.6, 0.1, 'g', [['medium', 'orta', 120]]],
  ['potato-boiled', 'Potato, boiled', 'Kartof, qaynadılmış', 87, 1.9, 20.1, 0.1, 'g', [['medium', 'orta', 170]]],
  ['potato-fried', 'Fried potatoes', 'Qızardılmış kartof', 196, 2.8, 25, 9.5, 'g', [['plate', 'boşqab', 250]]],
  ['fries', 'French fries', 'Kartof fri', 312, 3.4, 41.4, 14.7, 'g', [['medium', 'orta', 117]]],
  ['carrot', 'Carrot', 'Kök', 41, 0.9, 9.6, 0.2, 'g', [['medium', 'orta', 61]]],
  ['onion', 'Onion', 'Soğan', 40, 1.1, 9.3, 0.1, 'g', [['medium', 'orta', 110]]],
  ['pepper', 'Bell pepper', 'Bolqar bibəri', 31, 1, 6, 0.3, 'g', [['medium', 'orta', 119]]],
  ['eggplant', 'Eggplant, cooked', 'Badımcan, bişmiş', 35, 0.8, 8.7, 0.2, 'g', [['portion', 'porsiya', 100]]],
  ['broccoli', 'Broccoli', 'Brokkoli', 34, 2.8, 6.6, 0.4, 'g', [['cup', 'stəkan', 91]]],
  ['corn', 'Sweet corn', 'Qarğıdalı', 96, 3.4, 21, 1.5, 'g', [['ear', 'qıça', 100]]],
  ['greens', 'Herbs / lettuce', 'Göyərti / kahı', 15, 1.4, 2.9, 0.2, 'g', [['bunch', 'dəstə', 50]]],
  ['shepherd-salad', 'Shepherd salad (with oil)', 'Çoban salatı (yağlı)', 60, 1, 4, 4.5, 'g', [['bowl', 'kasa', 200]]],
  ['olivier', 'Olivier salad', 'Olivye (paytaxt) salatı', 180, 5, 8, 14, 'g', [['portion', 'porsiya', 150]]],

  // ---------- grains & bread ----------
  ['rice', 'Rice, cooked', 'Düyü, bişmiş', 130, 2.7, 28.2, 0.3, 'g', [['cup', 'stəkan', 158], ['plate', 'boşqab', 250]]],
  ['buckwheat', 'Buckwheat, cooked', 'Qarabaşaq, bişmiş', 92, 3.4, 19.9, 0.6, 'g', [['plate', 'boşqab', 200]]],
  ['bulgur', 'Bulgur, cooked', 'Bulqur, bişmiş', 83, 3.1, 18.6, 0.2, 'g', [['plate', 'boşqab', 200]]],
  ['pasta', 'Pasta, cooked', 'Makaron, bişmiş', 158, 5.8, 30.9, 0.9, 'g', [['plate', 'boşqab', 220]]],
  ['oats', 'Oats, dry', 'Yulaf, quru', 389, 16.9, 66.3, 6.9, 'g', [['serving', 'porsiya', 40]]],
  ['oatmeal', 'Oatmeal with water', 'Sulu yulaf sıyığı', 68, 2.4, 12, 1.4, 'g', [['bowl', 'kasa', 250]]],
  ['cornflakes', 'Corn flakes', 'Kornfleks', 357, 7.5, 84, 0.4, 'g', [['serving', 'porsiya', 30]]],
  ['white-bread', 'White bread', 'Ağ çörək', 265, 9, 49, 3.2, 'g', [['slice', 'dilim', 30]]],
  ['wholewheat-bread', 'Whole wheat bread', 'Kəpəkli çörək', 247, 13, 41, 3.4, 'g', [['slice', 'dilim', 32]]],
  ['tandir', 'Tandir bread', 'Təndir çörəyi', 250, 8, 50, 1.5, 'g', [['quarter loaf', '¼ çörək', 100]]],
  ['lavash', 'Lavash', 'Lavaş', 275, 9, 55, 1.5, 'g', [['1 sheet', '1 vərəq', 60]]],

  // ---------- meat, fish, eggs, legumes ----------
  ['chicken-breast', 'Chicken breast, cooked', 'Toyuq döşü, bişmiş', 165, 31, 0, 3.6, 'g', [['portion', 'porsiya', 150]]],
  ['chicken-thigh', 'Chicken thigh, cooked', 'Toyuq budu, bişmiş', 179, 24.8, 0, 8.2, 'g', [['1 pc', '1 ədəd', 100]]],
  ['beef', 'Beef, cooked', 'Mal əti, bişmiş', 250, 26, 0, 15, 'g', [['portion', 'porsiya', 150]]],
  ['lamb', 'Lamb, cooked', 'Qoyun əti, bişmiş', 294, 25.6, 0, 20.9, 'g', [['portion', 'porsiya', 150]]],
  ['kotlet', 'Meat patty (kotlet)', 'Kotlet', 250, 17, 8, 16, 'g', [['1 pc', '1 ədəd', 80]]],
  ['lula', 'Lula kebab', 'Lülə kabab', 270, 18, 1, 22, 'g', [['skewer', 'şiş', 100]]],
  ['tike', 'Meat kebab (tikə)', 'Tikə kabab', 230, 26, 0, 14, 'g', [['skewer', 'şiş', 150]]],
  ['tuna', 'Tuna, canned in water', 'Tuna, öz suyunda', 116, 25.5, 0, 0.8, 'g', [['can', 'banka', 130]]],
  ['salmon', 'Salmon, cooked', 'Qızılbalıq, bişmiş', 206, 22, 0, 12.4, 'g', [['fillet', 'fileto', 150]]],
  ['white-fish', 'White fish, cooked', 'Ağ balıq, bişmiş', 105, 22.8, 0, 0.9, 'g', [['fillet', 'fileto', 150]]],
  ['shrimp', 'Shrimp, cooked', 'Krevet, bişmiş', 99, 24, 0.2, 0.3, 'g', [['portion', 'porsiya', 100]]],
  ['egg', 'Egg, boiled', 'Yumurta, qaynadılmış', 155, 12.6, 1.1, 10.6, 'g', [['1 egg', '1 yumurta', 50]]],
  ['egg-fried', 'Egg, fried', 'Yumurta, qızardılmış', 196, 13.6, 0.8, 14.8, 'g', [['1 egg', '1 yumurta', 46]]],
  ['omelette', 'Omelette', 'Omlet', 154, 10.6, 0.6, 11.7, 'g', [['2 eggs', '2 yumurtalı', 120]]],
  ['sausage', 'Sausage (frankfurter)', 'Sosiska', 270, 11, 2, 24, 'g', [['1 pc', '1 ədəd', 45]]],
  ['kolbasa', 'Boiled sausage (kolbasa)', 'Kolbasa (doktorskaya)', 257, 12.8, 1.5, 22.2, 'g', [['slice', 'dilim', 20]]],
  ['sucuk', 'Sucuk', 'Sucuk', 450, 20, 1, 40, 'g', [['slice', 'dilim', 10]]],
  ['lentils', 'Lentils, cooked', 'Mərci, bişmiş', 116, 9, 20.1, 0.4, 'g', [['cup', 'stəkan', 198]]],
  ['chickpeas', 'Chickpeas, cooked', 'Noxud, bişmiş', 164, 8.9, 27.4, 2.6, 'g', [['cup', 'stəkan', 164]]],
  ['beans', 'Red beans, cooked', 'Lobya, bişmiş', 127, 8.7, 22.8, 0.5, 'g', [['cup', 'stəkan', 177]]],

  // ---------- dairy ----------
  ['milk', 'Milk 2.5%', 'Süd 2.5%', 54, 3, 4.7, 2.5, 'ml', [['glass', 'stəkan', 250]]],
  ['kefir', 'Kefir 2.5%', 'Kefir 2.5%', 53, 2.9, 4, 2.5, 'ml', [['glass', 'stəkan', 250]]],
  ['ayran', 'Ayran', 'Ayran', 36, 1.7, 2.8, 1.9, 'ml', [['glass', 'stəkan', 250]]],
  ['yogurt', 'Plain yogurt', 'Qatıq', 61, 3.5, 4.7, 3.3, 'g', [['cup', 'stəkan', 200]]],
  ['greek-yogurt', 'Greek yogurt 2%', 'Yunan qatığı 2%', 73, 9.9, 3.9, 1.9, 'g', [['cup', 'stəkan', 170]]],
  ['cottage', 'Cottage cheese 5%', 'Kəsmik 5%', 121, 17, 1.8, 5, 'g', [['pack', 'paket', 180]]],
  ['white-cheese', 'White cheese (feta)', 'Ağ pendir', 264, 14.2, 4.1, 21.3, 'g', [['slice', 'dilim', 30]]],
  ['hard-cheese', 'Hard cheese', 'Bərk pendir (qaşqaval)', 402, 25, 1.3, 33, 'g', [['slice', 'dilim', 20]]],
  ['butter', 'Butter', 'Kərə yağı', 717, 0.9, 0.1, 81.1, 'g', [['tbsp', 'xörək qaşığı', 14]]],
  ['sour-cream', 'Sour cream 20%', 'Xama 20%', 198, 2.4, 4.6, 19.4, 'g', [['tbsp', 'xörək qaşığı', 15]]],

  // ---------- fats, nuts, seeds ----------
  ['olive-oil', 'Olive oil', 'Zeytun yağı', 884, 0, 0, 100, 'g', [['tbsp', 'xörək qaşığı', 14]]],
  ['sunflower-oil', 'Sunflower oil', 'Günəbaxan yağı', 884, 0, 0, 100, 'g', [['tbsp', 'xörək qaşığı', 14]]],
  ['peanuts', 'Peanuts, roasted', 'Fıstıq (yer fındığı)', 585, 24, 21.3, 49.7, 'g', [['handful', 'ovuc', 30]]],
  ['peanut-butter', 'Peanut butter', 'Fıstıq ezmesi', 588, 25, 20, 50, 'g', [['tbsp', 'xörək qaşığı', 16]]],
  ['walnuts', 'Walnuts', 'Qoz', 654, 15.2, 13.7, 65.2, 'g', [['handful', 'ovuc', 28]]],
  ['almonds', 'Almonds', 'Badam', 579, 21.2, 21.6, 49.9, 'g', [['handful', 'ovuc', 28]]],
  ['hazelnuts', 'Hazelnuts', 'Fındıq', 628, 15, 16.7, 60.8, 'g', [['handful', 'ovuc', 28]]],
  ['pistachios', 'Pistachios', 'Püstə', 562, 20.2, 27.2, 45.3, 'g', [['handful', 'ovuc', 28]]],
  ['sunflower-seeds', 'Sunflower seeds, shelled', 'Tum (təmizlənmiş)', 584, 20.8, 20, 51.5, 'g', [['handful', 'ovuc', 30]]],
  ['mayo', 'Mayonnaise', 'Mayonez', 680, 1, 0.6, 75, 'g', [['tbsp', 'xörək qaşığı', 14]]],
  ['ketchup', 'Ketchup', 'Ketçup', 101, 1, 27, 0.1, 'g', [['tbsp', 'xörək qaşığı', 17]]],
  ['hummus', 'Hummus', 'Humus', 166, 7.9, 14.3, 9.6, 'g', [['tbsp', 'xörək qaşığı', 30]]],

  // ---------- sweets & snacks ----------
  ['sugar', 'Sugar', 'Şəkər', 387, 0, 100, 0, 'g', [['cube / tsp', 'qənd / çay qaşığı', 4]]],
  ['honey', 'Honey', 'Bal', 304, 0.3, 82.4, 0, 'g', [['tbsp', 'xörək qaşığı', 21]]],
  ['jam', 'Jam', 'Mürəbbə', 278, 0.4, 69, 0.1, 'g', [['tbsp', 'xörək qaşığı', 20]]],
  ['milk-chocolate', 'Milk chocolate', 'Südlü şokolad', 535, 7.7, 59.4, 29.7, 'g', [['piece', 'parça', 10], ['bar', 'tablet', 90]]],
  ['dark-chocolate', 'Dark chocolate 70%', 'Qara şokolad 70%', 598, 7.8, 45.9, 42.6, 'g', [['piece', 'parça', 10]]],
  ['biscuit', 'Biscuits / cookies', 'Peçenye', 465, 6.5, 70, 18, 'g', [['1 pc', '1 ədəd', 10]]],
  ['chips', 'Potato chips', 'Çips', 536, 7, 53, 35, 'g', [['small bag', 'kiçik paket', 40]]],
  ['ice-cream', 'Ice cream', 'Dondurma', 207, 3.5, 23.6, 11, 'g', [['scoop', 'kürə', 66]]],
  ['croissant', 'Croissant', 'Kruassan', 406, 8.2, 45.8, 21, 'g', [['1 pc', '1 ədəd', 57]]],
  ['cake', 'Cream cake', 'Tort (kremli)', 350, 5, 45, 17, 'g', [['slice', 'dilim', 100]]],
  ['pakhlava', 'Pakhlava (baklava)', 'Paxlava', 428, 6.7, 37.6, 29, 'g', [['piece', 'parça', 40]]],
  ['shekerbura', 'Shekerbura', 'Şəkərbura', 450, 7, 55, 22, 'g', [['1 pc', '1 ədəd', 40]]],

  // ---------- drinks ----------
  ['tea', 'Tea, no sugar', 'Çay, şəkərsiz', 1, 0, 0.3, 0, 'ml', [['armudu glass', 'armudu stəkan', 100], ['cup', 'fincan', 200]]],
  ['tea-sugar', 'Tea with 1 sugar cube', 'Çay, 1 qəndlə', 16, 0, 4, 0, 'ml', [['armudu glass', 'armudu stəkan', 100]]],
  ['coffee', 'Black coffee', 'Qara qəhvə', 2, 0.3, 0, 0, 'ml', [['cup', 'fincan', 240]]],
  ['cappuccino', 'Cappuccino', 'Kapuçino', 38, 2, 3.2, 2, 'ml', [['cup', 'fincan', 240]]],
  ['latte', 'Latte', 'Latte', 47, 3, 4.6, 1.8, 'ml', [['cup', 'fincan', 350]]],
  ['cola', 'Coca-Cola', 'Coca-Cola', 42, 0, 10.6, 0, 'ml', [['can', 'banka', 330], ['bottle', 'butulka', 500]]],
  ['cola-zero', 'Coca-Cola Zero', 'Coca-Cola Zero', 0.3, 0, 0, 0, 'ml', [['can', 'banka', 330]]],
  ['ice-tea', 'Iced tea (Fuse Tea type)', 'Soyuq çay (Fuse Tea tipli)', 30, 0, 7.5, 0, 'ml', [['bottle', 'butulka', 500]]],
  ['juice', 'Orange juice', 'Portağal şirəsi', 45, 0.7, 10.4, 0.2, 'ml', [['glass', 'stəkan', 250]]],
  ['energy', 'Energy drink', 'Enerji içkisi', 45, 0, 11, 0, 'ml', [['can', 'banka', 250]]],
  ['beer', 'Beer', 'Pivə', 43, 0.5, 3.6, 0, 'ml', [['bottle', 'butulka', 500]]],
  ['whey', 'Whey protein powder', 'Whey protein tozu', 400, 80, 8, 6, 'g', [['scoop', 'ölçü qaşığı', 30]]],

  // ---------- Azerbaijani & ready meals (home-recipe estimates) ----------
  ['plov', 'Plov with meat', 'Plov (ətli)', 200, 6, 26, 8, 'g', [['plate', 'boşqab', 300]]],
  ['dolma', 'Dolma (vine leaves, meat)', 'Yarpaq dolması (ətli)', 170, 8, 10, 11, 'g', [['1 pc', '1 ədəd', 30], ['portion (10)', 'porsiya (10)', 300]]],
  ['qutab-greens', 'Qutab with greens', 'Göy qutabı', 230, 6, 32, 9, 'g', [['1 pc', '1 ədəd', 70]]],
  ['qutab-meat', 'Qutab with meat', 'Ət qutabı', 260, 11, 28, 12, 'g', [['1 pc', '1 ədəd', 80]]],
  ['dushbara', 'Dushbara (soup)', 'Düşbərə', 75, 4, 7, 3.5, 'g', [['bowl', 'kasa', 350]]],
  ['dovga', 'Dovga', 'Dovğa', 50, 2.6, 5, 2, 'g', [['bowl', 'kasa', 300]]],
  ['piti', 'Piti', 'Piti', 120, 8, 8, 6.5, 'g', [['bowl', 'kasa', 400]]],
  ['lentil-soup', 'Lentil soup', 'Mərci şorbası', 70, 4, 10, 1.5, 'g', [['bowl', 'kasa', 300]]],
  ['borscht', 'Borscht', 'Borş', 50, 2, 6, 2, 'g', [['bowl', 'kasa', 350]]],
  ['doner', 'Chicken doner wrap', 'Toyuq dönər (lavaşda)', 220, 11, 22, 10, 'g', [['1 wrap', '1 ədəd', 300]]],
  ['pizza', 'Pizza (cheese)', 'Pizza (pendirli)', 266, 11.4, 33.3, 9.7, 'g', [['slice', 'dilim', 107]]],
  ['burger', 'Burger', 'Burger', 250, 13, 24, 11, 'g', [['1 pc', '1 ədəd', 200]]],
  ['nuggets', 'Chicken nuggets', 'Nagets', 296, 15, 18, 18, 'g', [['6 pcs', '6 ədəd', 100]]],
  ['blini', 'Pancake (blini)', 'Blinçik', 227, 6.4, 28.3, 9.7, 'g', [['1 pc', '1 ədəd', 40]]],
];

export function commonFoods(lang: Lang): Food[] {
  return ROWS.map(([key, en, az, kcal, protein, carbs, fat, unit, servings]) => ({
    key: `c:${key}`,
    name: lang === 'az' ? az : en,
    per100: { kcal, protein, carbs, fat },
    unit,
    servings: servings.map(([le, la, grams]) => ({ label: lang === 'az' ? la : le, grams })),
    source: 'common' as const,
    alt: lang === 'az' ? en : az,
  }));
}

export function myFoodToFood(r: MyFoodRow): Food {
  return {
    key: `m:${r.id}`,
    myId: r.id,
    name: r.name,
    brand: r.brand ?? undefined,
    per100: { kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat },
    unit: r.unit,
    servings: r.serving_g ? [{ label: r.serving_label || '1 serving', grams: r.serving_g }] : [],
    source: 'mine',
  };
}

/** Lowercase + fold Azerbaijani/Turkish letters so "fistiq" finds "Fıstıq". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Score a food against a normalized query; 0 = no match. */
export function matchScore(food: Food, q: string): number {
  if (!q) return 1;
  const hay = normalize(`${food.name} ${food.brand ?? ''} ${food.alt ?? ''}`);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.every((t) => hay.includes(t))) return 0;
  const name = normalize(food.name);
  if (name.startsWith(q)) return 3;
  if (name.split(/[\s,()/-]+/).some((w) => w.startsWith(tokens[0]))) return 2;
  return 1;
}

export function macrosFor(food: Food, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(food.per100.kcal * f),
    protein: Math.round(food.per100.protein * f * 10) / 10,
    carbs: Math.round(food.per100.carbs * f * 10) / 10,
    fat: Math.round(food.per100.fat * f * 10) / 10,
  };
}

// ---------- Open Food Facts (search-a-licious) ----------
const OFF_URL = 'https://search.openfoodfacts.org/search';

interface OffHit {
  code?: string;
  product_name?: string;
  brands?: string[] | string;
  nutriments?: Record<string, number>;
  serving_quantity?: number | string;
  quantity?: string;
}

export async function searchOnline(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `${OFF_URL}?q=${encodeURIComponent(query)}&page_size=25&fields=code,product_name,brands,nutriments,serving_quantity,quantity`;
  const res = await fetch(url, { signal, headers: { 'User-Agent': 'TrackYSF/1.0 (open-source calorie tracker)' } });
  if (!res.ok) return [];
  const json = (await res.json()) as { hits?: OffHit[] };
  const out: Food[] = [];
  for (const h of json.hits ?? []) {
    const n = h.nutriments ?? {};
    const kcal = Number(n['energy-kcal_100g']);
    const name = (h.product_name ?? '').trim();
    if (!name || !Number.isFinite(kcal) || kcal < 0 || kcal > 950) continue;
    const protein = Number(n.proteins_100g) || 0;
    const carbs = Number(n.carbohydrates_100g) || 0;
    const fat = Number(n.fat_100g) || 0;
    // drop entries whose macros contradict their calories badly (common data-entry errors)
    const est = protein * 4 + carbs * 4 + fat * 9;
    if (est > 0 && (kcal > est * 2.2 + 25 || kcal < est * 0.45 - 25)) continue;
    const brand = Array.isArray(h.brands) ? h.brands[0] : h.brands;
    const serving = Number(h.serving_quantity);
    const isDrink = /\b(ml|l|cl)\b/i.test(h.quantity ?? '');
    out.push({
      key: `o:${h.code ?? name}`,
      name,
      brand: brand || undefined,
      per100: { kcal, protein, carbs, fat },
      unit: isDrink ? 'ml' : 'g',
      servings: serving > 0 && serving < 3000 ? [{ label: '1 serving', grams: serving }] : [],
      source: 'online',
    });
  }
  return out;
}
