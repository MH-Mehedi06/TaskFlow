import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Category } from '../models/Category';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

const parentCategories = [
  {
    name: 'Home Cleaning',
    description: 'Professional cleaning services for every corner of your home.',
    icon: '🧹',
    startingPrice: 35,
    sortOrder: 1,
    trending: true,
    trendingTags: ['deep clean', 'move-out', 'weekly'],
  },
  {
    name: 'Handyman',
    description: 'Expert help for repairs, installations, and home improvements.',
    icon: '🔨',
    startingPrice: 45,
    sortOrder: 2,
    trending: true,
    trendingTags: ['assembly', 'mounting', 'repair'],
  },
  {
    name: 'Moving',
    description: 'Stress-free moving help from packing to unloading.',
    icon: '📦',
    startingPrice: 55,
    sortOrder: 3,
    trending: false,
    trendingTags: ['local move', 'packing', 'loading'],
  },
  {
    name: 'Outdoor & Gardening',
    description: 'Keep your lawn and garden looking its best year-round.',
    icon: '🌿',
    startingPrice: 40,
    sortOrder: 4,
    trending: false,
    trendingTags: ['lawn mowing', 'landscaping', 'weeding'],
  },
  {
    name: 'Tech Support',
    description: 'On-demand tech help for computers, smart home, and more.',
    icon: '💻',
    startingPrice: 50,
    sortOrder: 5,
    trending: true,
    trendingTags: ['computer help', 'wifi', 'smart home'],
  },
  {
    name: 'Painting',
    description: 'Transform your space with professional painting services.',
    icon: '🎨',
    startingPrice: 60,
    sortOrder: 6,
    trending: false,
    trendingTags: ['interior', 'exterior', 'cabinets'],
  },
  {
    name: 'Fitness & Wellness',
    description: 'Certified trainers and wellness professionals at your door.',
    icon: '💪',
    startingPrice: 65,
    sortOrder: 7,
    trending: true,
    trendingTags: ['personal training', 'yoga', 'nutrition'],
  },
];

const subCategoriesByParent: Record<string, { name: string; description: string; startingPrice: number; sortOrder: number }[]> = {
  'Home Cleaning': [
    { name: 'Standard Cleaning', description: 'Regular tidying and surface cleaning of your home.', startingPrice: 35, sortOrder: 1 },
    { name: 'Deep Cleaning', description: 'Thorough top-to-bottom cleaning including hard-to-reach areas.', startingPrice: 65, sortOrder: 2 },
    { name: 'Move-in/Out Cleaning', description: 'Complete clean for moving in or handing back a property.', startingPrice: 80, sortOrder: 3 },
    { name: 'Carpet Cleaning', description: 'Steam or dry cleaning to restore your carpets.', startingPrice: 50, sortOrder: 4 },
    { name: 'Window Cleaning', description: 'Streak-free interior and exterior window cleaning.', startingPrice: 40, sortOrder: 5 },
    { name: 'Laundry & Folding', description: 'Washing, drying, and folding laundry loads.', startingPrice: 30, sortOrder: 6 },
  ],
  'Handyman': [
    { name: 'Furniture Assembly', description: 'Quick and careful assembly of flat-pack furniture.', startingPrice: 45, sortOrder: 1 },
    { name: 'TV Mounting', description: 'Secure wall mounting for all TV sizes.', startingPrice: 55, sortOrder: 2 },
    { name: 'Picture Hanging', description: 'Expert hanging for art, mirrors, and shelves.', startingPrice: 35, sortOrder: 3 },
    { name: 'Door & Lock Repair', description: 'Fix sticky doors, broken locks, and hinges.', startingPrice: 50, sortOrder: 4 },
    { name: 'Plumbing Fixes', description: 'Minor plumbing repairs including faucets and toilets.', startingPrice: 60, sortOrder: 5 },
    { name: 'Drywall Repair', description: 'Patch holes and cracks in walls and ceilings.', startingPrice: 55, sortOrder: 6 },
  ],
  'Moving': [
    { name: 'Local Moving', description: 'Full-service move within the same city or area.', startingPrice: 80, sortOrder: 1 },
    { name: 'Help Loading', description: 'Muscle power to load your truck or container.', startingPrice: 55, sortOrder: 2 },
    { name: 'Help Unloading', description: 'Careful unloading and placement of your belongings.', startingPrice: 55, sortOrder: 3 },
    { name: 'Packing Services', description: 'Professional packing with quality materials.', startingPrice: 60, sortOrder: 4 },
    { name: 'Furniture Delivery', description: 'Deliver and set up large furniture items.', startingPrice: 65, sortOrder: 5 },
    { name: 'Junk Removal', description: 'Haul away unwanted items and dispose responsibly.', startingPrice: 70, sortOrder: 6 },
  ],
  'Outdoor & Gardening': [
    { name: 'Lawn Mowing', description: 'Regular mowing to keep your lawn neat and healthy.', startingPrice: 40, sortOrder: 1 },
    { name: 'Garden Planting', description: 'Plant flowers, shrubs, and seasonal beds.', startingPrice: 50, sortOrder: 2 },
    { name: 'Leaf & Debris Removal', description: 'Clear fallen leaves and yard debris.', startingPrice: 45, sortOrder: 3 },
    { name: 'Hedge Trimming', description: 'Shape and trim hedges, bushes, and topiaries.', startingPrice: 50, sortOrder: 4 },
    { name: 'Tree Trimming', description: 'Safe pruning of small to medium trees.', startingPrice: 75, sortOrder: 5 },
    { name: 'Weed Control', description: 'Remove and prevent weeds in lawn and garden beds.', startingPrice: 40, sortOrder: 6 },
  ],
  'Tech Support': [
    { name: 'Computer Repair', description: 'Diagnose and fix laptop or desktop issues.', startingPrice: 50, sortOrder: 1 },
    { name: 'WiFi Setup', description: 'Set up routers, extenders, and mesh networks.', startingPrice: 45, sortOrder: 2 },
    { name: 'Smart Home Setup', description: 'Install and configure smart devices and hubs.', startingPrice: 60, sortOrder: 3 },
    { name: 'TV & AV Installation', description: 'Install and connect TVs, soundbars, and streaming devices.', startingPrice: 55, sortOrder: 4 },
    { name: 'Phone Screen Repair', description: 'Replace cracked screens on popular phone models.', startingPrice: 60, sortOrder: 5 },
    { name: 'Data Backup & Recovery', description: 'Back up important files and recover lost data.', startingPrice: 65, sortOrder: 6 },
  ],
  'Painting': [
    { name: 'Interior Painting', description: 'Refresh walls and ceilings in any room.', startingPrice: 60, sortOrder: 1 },
    { name: 'Exterior Painting', description: 'Protect and beautify your home\'s exterior.', startingPrice: 80, sortOrder: 2 },
    { name: 'Cabinet Painting', description: 'Give kitchen or bathroom cabinets a new look.', startingPrice: 70, sortOrder: 3 },
    { name: 'Deck Staining', description: 'Stain and seal decks, fences, and pergolas.', startingPrice: 65, sortOrder: 4 },
    { name: 'Wallpaper Removal', description: 'Strip old wallpaper and prep walls for painting.', startingPrice: 55, sortOrder: 5 },
    { name: 'Touch-ups & Trim', description: 'Patch and touch up scuffs, trim, and baseboards.', startingPrice: 45, sortOrder: 6 },
  ],
  'Fitness & Wellness': [
    { name: 'Personal Training', description: 'One-on-one workout sessions tailored to your goals.', startingPrice: 65, sortOrder: 1 },
    { name: 'Yoga Instruction', description: 'Private or small group yoga sessions at home.', startingPrice: 60, sortOrder: 2 },
    { name: 'Pilates', description: 'Core-focused Pilates sessions for all levels.', startingPrice: 60, sortOrder: 3 },
    { name: 'Nutrition Coaching', description: 'Personalized meal plans and dietary guidance.', startingPrice: 70, sortOrder: 4 },
    { name: 'Running Coach', description: 'Training plans and coaching for runners of any pace.', startingPrice: 55, sortOrder: 5 },
    { name: 'Boxing Training', description: 'Pad work and boxing fitness sessions.', startingPrice: 65, sortOrder: 6 },
  ],
};

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await Category.deleteMany({});
  console.log('Cleared existing categories');

  const parentDocs = await Category.create(parentCategories);
  console.log(`Inserted ${parentDocs.length} parent categories`);

  let subCount = 0;
  for (const parent of parentDocs) {
    const subs = subCategoriesByParent[parent.name] || [];
    for (const sub of subs) {
      await Category.create({ ...sub, parentId: parent._id });
      subCount++;
    }
  }
  console.log(`Inserted ${subCount} sub-categories`);

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
