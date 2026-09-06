import { Food } from '../types';
import type { ImageSourcePropType } from 'react-native';

const IMAGES = {
  fresh: require('../../assets/food-salad.jpg') as ImageSourcePropType,
  savory: require('../../assets/food-biryani.jpg') as ImageSourcePropType,
};

// These are packaged in the APK, rather than fetched from the web at runtime.
// This keeps the Home, Search and macro-card photography visible on every phone.
export const BUNDLED_FOOD_IMAGES = {
  biryani: require('../../assets/food-biryani.jpg') as ImageSourcePropType,
  grill: require('../../assets/food-grill.jpg') as ImageSourcePropType,
  salad: require('../../assets/food-salad.jpg') as ImageSourcePropType,
  grains: require('../../assets/food-grains.jpg') as ImageSourcePropType,
};

function bundledFoodImage(id: string): ImageSourcePropType {
  if (id.includes('fit') || id.includes('brand')) return BUNDLED_FOOD_IMAGES.grill;
  if (id.includes('sa_101') || id.includes('me_') || id.includes('af_')) return BUNDLED_FOOD_IMAGES.biryani;
  if (id.includes('eu_') || id.includes('au_') || id.includes('am_')) return BUNDLED_FOOD_IMAGES.grill;
  return id.length % 2 ? BUNDLED_FOOD_IMAGES.salad : BUNDLED_FOOD_IMAGES.grains;
}

// Prototype-only remote food photography. Every database item has a distinct,
// dish-specific image; production can move these licensed assets to its own CDN.
const FOOD_IMAGES: Record<string, string> = {
  sa_101: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Biryani
  sa_102: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Lentils / Dal
  sa_103: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Chicken Karahi
  sa_104: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Paratha
  sa_105: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Haleem / Stew
  sa_106: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Samosa
  sa_107: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Boiled Egg
  sa_108: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Omelette
  sa_109: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Roti / Chapati
  sa_110: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Naan
  sa_111: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Lassi
  sa_112: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Chai Tea
  sa_113: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Dal Bhat
  sa_114: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Nihari / Meat dish
  sa_115: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Tandoori Chicken
  sa_116: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Kabobs
  sa_117: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Milk
  sa_118: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Salad
  fit_101: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Grilled Chicken Breast
  fit_102: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Steamed Rice
  fit_103: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Oatmeal
  fit_104: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Whey Protein
  fit_105: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Peanut Butter
  fit_106: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Banana
  fit_107: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Apple
  me_101: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Shawarma
  me_102: 'https://images.unsplash.com/photo-1577906096429-f73c2c312435?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Hummus
  me_103: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Falafel
  me_104: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Machboos
  eu_101: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Pizza
  eu_102: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Pasta
  eu_103: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Paella
  eu_104: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Croissant
  af_101: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Jollof Rice
  af_102: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Tagine
  af_103: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Injera
  af_104: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Suya Skewers
  am_101: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Cheeseburger
  am_102: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Tacos
  am_103: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Burrito
  am_104: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Mac & Cheese
  au_101: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Avocado Toast
  au_102: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Chicken Parm
  au_103: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Meat Pie
  brand_088: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Chips
  brand_112: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Protein Bar
  brand_205: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&h=500&fit=crop&q=80', // Big Burger
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
    image: options.image ?? bundledFoodImage(id),
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
  food('brand_113', 'KFC Mighty Zinger', 'South Asian', 1000, '1 double-fillet burger (estimated 900–1,150 kcal)', 50, 64, 56, 2, {
    brand: 'KFC',
    isBranded: true,
    processingLevel: 'Ultra-Processed',
    accessTier: 'plus',
    keywords: ['kfc mighty zinger', 'mighty zinger', 'double zinger', 'double fillet burger'],
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
  protein: BUNDLED_FOOD_IMAGES.grill,
  carbs: BUNDLED_FOOD_IMAGES.grains,
  fats: BUNDLED_FOOD_IMAGES.biryani,
  fiber: BUNDLED_FOOD_IMAGES.salad,
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
