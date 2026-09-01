require('dotenv').config();
const mongoose = require('mongoose');
const WorkerCategory = require('./models/WorkerCategory');
const FeatureToggle = require('./models/FeatureToggle');
const connectDB = require('./config/db');

const initialCategories = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "AC Repair",
  "Home Cleaning",
  "Painter",
  "Appliance Repair",
  "Pest Control",
  "Packers & Movers",
  "General Labour",
  "Water Tank Cleaning",
  "Mason / Raj Mistri",
  "Welder / Fabricator",
  "RO / Water Purifier Repair",
  "Washing Machine Repair",
  "Refrigerator Repair",
  "TV / Electronics Repair",
  "Geyser Repair",
  "CCTV Installation",
  "Computer / Laptop Repair",
  "Mobile Repair",
  "Solar Technician",
  "Gardener / Mali",
  "Tile / Marble Work",
  "POP / False Ceiling",
  "Waterproofing",
  "Furniture Work",
  "Loading / Unloading",
  "Other Services"
];

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to Database. Starting Seeding...');

    // 1. Seed Feature Toggle for workers_service
    const toggleKey = 'workers_service';
    let toggle = await FeatureToggle.findOne({ key: toggleKey });

    if (!toggle) {
        console.log(`Creating master feature toggle: ${toggleKey}`);
        await FeatureToggle.create({
            key: toggleKey,
            label: 'Workers Service',
            description: 'Enable or disable the worker marketplace',
            isEnabled: true
        });
    } else {
        console.log(`Feature toggle ${toggleKey} already exists.`);
    }

    // 2. Seed Worker Categories
    for (let i = 0; i < initialCategories.length; i++) {
        const name = initialCategories[i];
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existingCat = await WorkerCategory.findOne({ slug });
        if (!existingCat) {
            console.log(`Creating category: ${name}`);
            await WorkerCategory.create({
                name,
                slug,
                displayOrder: i + 1,
                isActive: true
            });
        }
    }

    console.log('Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedData();
