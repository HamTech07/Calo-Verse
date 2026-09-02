import { Food } from '../types';

const IMAGES = {
  fresh:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAZZgBD_YrG3yp01Lbu9JLg8XbtVfSZuJjmqgt2r6yZh9D7YEJJHVenLiW0Mlg-iR6mPMTQdBXKf9pjTeHcVyNCiX6Wx3gyTaNsIqgnK3SjLEnn6gliKc5rbss4rmNL2fiGI91T5KD9Amm98ZN75GNUTp4vFTWTRJNSPezL_J4nnLOJIXwCiV1f1ay4EUm_2azReFv7_DmoQo57zYT57bvwWzfQE7Do5z9t4eCCgnvq9WnWQusBFv5_EQ',
  savory:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAba-aygcKSPDJOoKad28gMj4TULMd6JrGtX77j0tz929ECHtrWYRTi7IHnSCEw6vTw49Wob18IhACS0_xEcaHHeoy3pODi9wjR0rJPuAXrysqoPsirICiUvgwzCJHny_8thWmzac8LPA9RiMytBUpNzc6at3zBT3828qi0Db_lPdqH5uJA9O25gZ23qZd-oJXptVqOjVy1v1BmDsWdo5l9gzcEA4j4U8_nZHGLESycSWk6zrswwJwpNA',
};

// Prototype-only remote food photography. Every database item has a distinct,
// dish-specific image; production can move these licensed assets to its own CDN.
const FOOD_IMAGES: Record<string, string> = {
  sa_101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/960px-%22Hyderabadi_Dum_Biryani%22.jpg',
  sa_102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/3_types_of_lentil.png/960px-3_types_of_lentil.png',
  sa_103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Punjabi_Chicken_Karahi.JPG/960px-Punjabi_Chicken_Karahi.JPG',
  sa_104: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Triangle_paratha_%28cropped%29.JPG/960px-Triangle_paratha_%28cropped%29.JPG',
  sa_105: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Pakistani_Haleem_served_with_garnish.jpg/960px-Pakistani_Haleem_served_with_garnish.jpg',
  sa_106: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Samosas%2C_snack_food_at_Wikipedia%27s_16th_Birthday_celebration_in_Chittagong_%2801%29.jpg/960px-Samosas%2C_snack_food_at_Wikipedia%27s_16th_Birthday_celebration_in_Chittagong_%2801%29.jpg',
  sa_107: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Soft-boiled-egg.jpg/960px-Soft-boiled-egg.jpg',
  sa_108: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Gorgonzola_%2B_Bacon_Omelette_%40_Omelegg_%40_Amsterdam_%2816600947041%29.jpg/960px-Gorgonzola_%2B_Bacon_Omelette_%40_Omelegg_%40_Amsterdam_%2816600947041%29.jpg',
  sa_109: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/2_Chapati_warm_and_ready_to_be_eaten.jpg/960px-2_Chapati_warm_and_ready_to_be_eaten.jpg',
  sa_110: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg',
  sa_111: 'https://images.slurrp.com/prod/rich_article/81n8p5s006.webp?height=500&impolicy=slurrp-20210601&width=880',
  sa_112: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Chai_In_Sakora.jpg',
  sa_113: 'https://wfg32p.s3.amazonaws.com/media/dishes/dal_bhat_4393.jpg',
  sa_114: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Nalli_Nihari_India.jpg/960px-Nalli_Nihari_India.jpg',
  sa_115: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Tandoorimumbai.jpg',
  sa_116: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Pakistani_Food_Beef_Kabobs.jpg/960px-Pakistani_Food_Beef_Kabobs.jpg',
  sa_117: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Glass_of_Milk_%2833657535532%29.jpg/960px-Glass_of_Milk_%2833657535532%29.jpg',
  sa_118: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Salad_platter.jpg/960px-Salad_platter.jpg',
  fit_101: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=720&q=82',
  fit_102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Meshi_001.jpg/960px-Meshi_001.jpg',
  fit_103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Oatmeal.jpg/960px-Oatmeal.jpg',
  fit_104: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=720&q=82',
  fit_105: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/2020-03-24_20_57_22_An_open_jar_of_Skippy_Creamy_Peanut_Butter_in_the_Dulles_section_of_Sterling%2C_Loudoun_County%2C_Virginia.jpg/960px-2020-03-24_20_57_22_An_open_jar_of_Skippy_Creamy_Peanut_Butter_in_the_Dulles_section_of_Sterling%2C_Loudoun_County%2C_Virginia.jpg',
  fit_106: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg',
  fit_107: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/960px-Pink_lady_and_cross_section.jpg',
  me_101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Shawarma_2.jpg/960px-Shawarma_2.jpg',
  me_102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Lebanese_style_hummus.jpg/960px-Lebanese_style_hummus.jpg',
  me_103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Falafels_2.jpg/960px-Falafels_2.jpg',
  me_104: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Machboos_%28cropped%29.JPG/960px-Machboos_%28cropped%29.JPG',
  eu_101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Pizza_Margherita_stu_spivack.jpg/960px-Pizza_Margherita_stu_spivack.jpg',
  eu_102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Spaghettata.JPG/960px-Spaghettata.JPG',
  eu_103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/01_Paella_Valenciana_original.jpg/960px-01_Paella_Valenciana_original.jpg',
  eu_104: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Croissant-Petr_Kratochvil.jpg/960px-Croissant-Petr_Kratochvil.jpg',
  af_101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Jollof_Rice_with_Stew.jpg/960px-Jollof_Rice_with_Stew.jpg',
  af_102: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Tajine-marocain-un-plat-varie-et-sain_%28cropped%29.jpg',
  af_103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Injera_with_eight_kinds_of_stew.jpg/960px-Injera_with_eight_kinds_of_stew.jpg',
  af_104: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/SuyavarietiesTX.JPG/960px-SuyavarietiesTX.JPG',
  am_101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cheeseburger.jpg/960px-Cheeseburger.jpg',
  am_102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/001_Tacos_de_carnitas%2C_carne_asada_y_al_pastor.jpg/960px-001_Tacos_de_carnitas%2C_carne_asada_y_al_pastor.jpg',
  am_103: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Burrito.JPG/960px-Burrito.JPG',
  am_104: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Original_Mac_n_Cheese_.jpg/960px-Original_Mac_n_Cheese_.jpg',
  au_101: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Avocado_toast_at_Voyager_Espresso_%2833134505776%29.jpg/960px-Avocado_toast_at_Voyager_Espresso_%2833134505776%29.jpg',
  au_102: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Chicken_parm_at_a_diner.jpg/960px-Chicken_parm_at_a_diner.jpg',
  au_103: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Meat_pie.jpg',
  brand_088: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Lay%27s_2025.svg/960px-Lay%27s_2025.svg.png',
  brand_112: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=720&q=82',
  brand_205: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Big_Mac.png/960px-Big_Mac.png',
};

function food(
  id: string,
  name: string,
  region: string,
  calories: number,
  portionSize: string,
  protein: number,
  carbs: number,
  fats: number,
  fiber: number,
  options: Partial<Food> = {},
): Food {
  return {
    id,
    name,
    region,
    brand: 'Homemade / Generic',
    isBranded: false,
    portionSize,
    calories,
    protein,
    carbs,
    fats,
    fiber,
    processingLevel: 'Minimally Processed',
    accessTier: 'free',
    ...options,
    image: FOOD_IMAGES[id] ?? options.image ?? (id.length % 2 ? IMAGES.fresh : IMAGES.savory),
  };
}

export const regions = [
  'All',
  'South Asian',
  'Middle Eastern',
  'European',
  'African',
  'American & Latin',
  'Australian',
];

export const foods: Food[] = [
  // Breakfast & Staples (South Asian)
  food('sa_101', 'Chicken Biryani', 'South Asian', 480, '1 plate (250g)', 28, 58, 14, 2.5, {
    keywords: ['biryani', 'chicken biryani', 'rice', 'chawal', 'pulao'],
  }),
  food('sa_102', 'Daal Tadka', 'South Asian', 260, '1 bowl (220g)', 13, 37, 7, 9, {
    keywords: ['daal', 'dal', 'daal tadka', 'yellow daal', 'lentils'],
  }),
  food('sa_103', 'Chicken Karahi', 'South Asian', 390, '1 bowl (220g)', 36, 12, 22, 3, {
    keywords: ['karahi', 'chicken karahi', 'chicken salan', 'salan', 'curry'],
  }),
  food('sa_104', 'Plain Paratha', 'South Asian', 280, '1 medium', 6, 36, 13, 3, {
    keywords: ['paratha', 'parathay', 'parathe', 'plain paratha', 'oil paratha', 'nashta paratha'],
  }),
  food('sa_105', 'Beef Haleem', 'South Asian', 330, '1 bowl (250g)', 22, 35, 11, 6, {
    keywords: ['haleem', 'beef haleem', 'chicken haleem', 'daleem'],
  }),
  food('sa_106', 'Vegetable Samosa', 'South Asian', 160, '1 piece (70g)', 4, 21, 7, 2, {
    keywords: ['samosa', 'samosay', 'samose', 'veg samosa', 'aloo samosa'],
  }),
  food('sa_107', 'Boiled Egg (Anda)', 'South Asian', 70, '1 large egg', 6, 0.5, 5, 0, {
    keywords: ['egg', 'eggs', 'anda', 'anday', 'boiled egg', 'ubla anda', 'boiled anda'],
    image: IMAGES.fresh,
  }),
  food('sa_108', 'Fried Egg / Omelette', 'South Asian', 115, '1 egg omelette', 7, 1, 9, 0, {
    keywords: ['fried egg', 'omelette', 'half fry', 'omlet', 'anda fry', 'fried anda'],
    image: IMAGES.savory,
  }),
  food('sa_109', 'Roti / Chapati', 'South Asian', 105, '1 medium roti', 3.5, 22, 0.5, 3, {
    keywords: ['roti', 'rotian', 'chapati', 'chapatian', 'phulka', 'gandhum roti'],
    image: IMAGES.fresh,
  }),
  food('sa_110', 'Tandoori Naan', 'South Asian', 260, '1 naan', 8, 48, 4, 2, {
    keywords: ['naan', 'tandoori naan', 'roghni naan', 'kulcha', 'khamiri roti'],
  }),
  food('sa_111', 'Aloo Paratha', 'South Asian', 320, '1 paratha', 6, 45, 14, 4, {
    keywords: ['aloo paratha', 'alu paratha', 'stuffed paratha'],
  }),
  food('sa_112', 'Doodh Patti Chai', 'South Asian', 130, '1 cup (180ml)', 4, 15, 6, 0, {
    keywords: ['chai', 'tea', 'doodh patti', 'milk tea', 'karak chai', 'cup chai'],
    image: IMAGES.fresh,
  }),
  food('sa_113', 'Daal Chawal Combo', 'South Asian', 420, '1 plate (300g)', 14, 72, 8, 8, {
    keywords: ['daal chawal', 'dal chawal', 'daal rice', 'dal rice'],
  }),
  food('sa_114', 'Beef Nihari', 'South Asian', 520, '1 bowl (250g)', 38, 18, 34, 2, {
    keywords: ['nihari', 'beef nihari', 'chicken nihari', 'nalli nihari'],
  }),
  food('sa_115', 'Chicken Tikka', 'South Asian', 220, '1 breast piece (180g)', 36, 2, 7, 1, {
    keywords: ['tikka', 'chicken tikka', 'bbq chicken', 'tikka boti'],
  }),
  food('sa_116', 'Seekh Kabab', 'South Asian', 280, '2 skewers', 26, 5, 17, 1.5, {
    keywords: ['kabab', 'seekh kabab', 'shami kabab', 'kebab'],
  }),
  food('sa_117', 'Fresh Whole Milk', 'South Asian', 150, '1 glass (250ml)', 8, 12, 8, 0, {
    keywords: ['milk', 'doodh', 'glass milk', 'fresh milk', 'glass doodh'],
    image: IMAGES.fresh,
  }),
  food('sa_118', 'Fresh Green Salad', 'South Asian', 45, '1 bowl (150g)', 2, 8, 0.5, 3.5, {
    keywords: ['salad', 'green salad', 'kheera', 'cucumber', 'tamatar'],
    image: IMAGES.fresh,
  }),

  // Fitness / Diet / Bulk Staples
  food('fit_101', 'Grilled Chicken Breast', 'American & Latin', 240, '150g fillet', 46, 0, 5, 0, {
    keywords: ['chicken breast', 'boiled chicken', 'grilled chicken', 'chicken fillet', 'breast piece'],
  }),
  food('fit_102', 'Boiled White Rice', 'South Asian', 195, '1 cup cooked (150g)', 4, 44, 0.5, 1, {
    keywords: ['white rice', 'rice', 'boiled rice', 'chawal', 'boiled chawal'],
    image: IMAGES.fresh,
  }),
  food('fit_103', 'Oatmeal with Milk & Banana', 'European', 320, '1 bowl (300g)', 12, 56, 6, 6, {
    keywords: ['oats', 'oatmeal', 'daliya', 'porridge', 'oats with milk'],
    image: IMAGES.fresh,
  }),
  food('fit_104', 'Whey Protein Shake', 'American & Latin', 130, '1 scoop with water', 25, 3, 1.5, 1, {
    keywords: ['whey', 'protein shake', 'whey protein', 'protein', 'shake'],
    image: IMAGES.fresh,
  }),
  food('fit_105', 'Peanut Butter Toast', 'American & Latin', 270, '2 slices + 2 tbsp PB', 11, 28, 14, 4, {
    keywords: ['peanut butter', 'pb toast', 'peanut butter bread', 'toast'],
  }),
  food('fit_106', 'Fresh Banana', 'All', 105, '1 medium (118g)', 1.3, 27, 0.3, 3, {
    keywords: ['banana', 'kela', 'kelay', 'bananas'],
    image: IMAGES.fresh,
  }),
  food('fit_107', 'Fresh Apple', 'All', 95, '1 medium (182g)', 0.5, 25, 0.3, 4.4, {
    keywords: ['apple', 'seb', 'apples'],
    image: IMAGES.fresh,
  }),

  // Middle Eastern
  food('me_101', 'Chicken Shawarma', 'Middle Eastern', 430, '1 wrap', 30, 43, 16, 4, {
    keywords: ['shawarma', 'chicken shawarma', 'roll', 'chicken roll'],
  }),
  food('me_102', 'Hummus', 'Middle Eastern', 170, '1/2 cup', 5, 14, 11, 6, {
    keywords: ['hummus', 'chickpea dip'],
  }),
  food('me_103', 'Falafel Plate', 'Middle Eastern', 410, '5 pieces + salad', 15, 45, 20, 10, {
    keywords: ['falafel', 'falafel plate', 'falafel wrap'],
  }),
  food('me_104', 'Chicken Kabsa', 'Middle Eastern', 520, '1 plate (300g)', 34, 61, 15, 3, {
    keywords: ['kabsa', 'mandi', 'chicken mandi', 'arabic rice'],
  }),

  // European
  food('eu_101', 'Pizza Margherita', 'European', 260, '1 large slice', 11, 34, 9, 2, {
    keywords: ['pizza', 'pizza slice', 'cheese pizza', 'margherita'],
  }),
  food('eu_102', 'Pasta Pomodoro', 'European', 390, '1 bowl (280g)', 13, 68, 8, 7, {
    keywords: ['pasta', 'macaroni', 'spaghetti', 'noodles'],
  }),
  food('eu_103', 'Spanish Paella', 'European', 440, '1 plate (280g)', 27, 54, 12, 4),
  food('eu_104', 'Butter Croissant', 'European', 230, '1 medium', 5, 26, 12, 1, {
    keywords: ['croissant', 'bakery', 'pastry'],
  }),

  // African
  food('af_101', 'Jollof Rice', 'African', 390, '1 plate (250g)', 9, 64, 11, 5),
  food('af_102', 'Chicken Tagine', 'African', 360, '1 bowl (260g)', 32, 25, 15, 6),
  food('af_103', 'Injera with Wat', 'African', 470, '1 serving', 20, 67, 13, 11),
  food('af_104', 'Beef Suya', 'African', 310, '5 skewers', 34, 10, 15, 2),

  // American & Latin
  food('am_101', 'Classic Cheeseburger', 'American & Latin', 540, '1 burger', 29, 42, 28, 3, {
    keywords: ['burger', 'cheeseburger', 'beef burger', 'patty burger'],
  }),
  food('am_102', 'Chicken Tacos', 'American & Latin', 390, '3 tacos', 28, 39, 14, 7, {
    keywords: ['taco', 'tacos', 'chicken tacos'],
  }),
  food('am_103', 'Bean Burrito', 'American & Latin', 470, '1 burrito', 18, 72, 13, 13),
  food('am_104', 'Mac & Cheese', 'American & Latin', 430, '1 bowl (250g)', 16, 49, 19, 2),

  // Australian
  food('au_101', 'Avocado Toast', 'Australian', 350, '2 slices', 10, 38, 18, 9, {
    keywords: ['avocado toast', 'avocado', 'avo toast'],
    image: IMAGES.fresh,
  }),
  food('au_102', 'Chicken Parmigiana', 'Australian', 590, '1 fillet', 47, 35, 29, 4),
  food('au_103', 'Aussie Meat Pie', 'Australian', 430, '1 pie', 18, 38, 23, 3),

  // Branded / Packaged
  food('brand_088', 'Lays Masala Chips', 'South Asian', 185, '1 pack (35g)', 2, 19, 11, 0.8, {
    brand: 'Lays',
    isBranded: true,
    processingLevel: 'Ultra-Processed',
    accessTier: 'plus',
    keywords: ['lays', 'chips', 'crisps', 'masala chips'],
  }),
  food('brand_112', 'KFC Zinger Burger', 'South Asian', 630, '1 burger', 31, 55, 32, 3, {
    brand: 'KFC',
    isBranded: true,
    processingLevel: 'Ultra-Processed',
    accessTier: 'plus',
    keywords: ['kfc', 'zinger', 'zinger burger', 'crispy burger'],
  }),
  food('brand_205', "McDonald's Big Mac", 'American & Latin', 590, '1 burger', 25, 46, 34, 3, {
    brand: "McDonald's",
    isBranded: true,
    processingLevel: 'Ultra-Processed',
    accessTier: 'plus',
    keywords: ['mcdonalds', 'big mac', 'mc donalds'],
  }),
];

export const MACRO_BACKGROUNDS = {
  protein:
    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80',
  carbs:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
  fats:
    'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80',
  fiber:
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
};

export const scanDemoDishes: Food[] = [
  foods.find((f) => f.id === 'sa_114') ??
    food('sa_114', 'Beef Nihari', 'South Asian', 520, '1 bowl (250g)', 38, 18, 34, 2, {
      keywords: ['nihari', 'beef nihari', 'chicken nihari'],
      image: IMAGES.savory,
    }),
  foods.find((f) => f.id === 'sa_101') ??
    food('sa_101', 'Chicken Biryani', 'South Asian', 480, '1 plate (250g)', 28, 58, 14, 2.5, {
      keywords: ['biryani', 'chicken biryani'],
      image: IMAGES.savory,
    }),
  foods.find((f) => f.id === 'sa_103') ??
    food('sa_103', 'Chicken Karahi', 'South Asian', 390, '1 bowl (220g)', 36, 12, 22, 3, {
      keywords: ['karahi', 'chicken karahi'],
      image: IMAGES.savory,
    }),
  food('fit_demo_egg', '2 Eggs & Paratha', 'South Asian', 410, '2 eggs + 1 paratha', 18, 37, 23, 3, {
    keywords: ['egg paratha', 'anda paratha'],
    image: IMAGES.fresh,
  }),
];

export const demoScanFood: Food = scanDemoDishes[0];
