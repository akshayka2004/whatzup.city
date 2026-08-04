import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@keralafloodrelief.gov.in";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@12345";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Portal Administrator";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: adminName, email: adminEmail, passwordHash },
  });

  console.log(`Seeded administrator account: ${adminEmail}`);

  const alertCount = await prisma.notification.count();
  if (alertCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          title: "Heavy rainfall warning for coastal districts",
          description:
            "IMD has issued an orange alert for Ernakulam, Alappuzha and Kottayam districts for the next 48 hours. Residents in low-lying areas are advised to move to relief camps.",
          category: "WEATHER_WARNING",
          district: "ERNAKULAM",
          publishedDate: new Date(),
          status: "ACTIVE",
          isPinned: true,
        },
        {
          title: "NH-66 partially closed near Chengannur",
          description:
            "A stretch of NH-66 near Chengannur is closed due to waterlogging. Commuters are advised to use the Thiruvalla bypass.",
          category: "ROAD_CLOSURE",
          district: "ALAPPUZHA",
          publishedDate: new Date(),
          status: "ACTIVE",
          isPinned: false,
        },
        {
          title: "Rescue operations completed in Pandanad",
          description:
            "NDRF teams have completed rescue operations in Pandanad village. All 42 stranded residents have been moved to safety.",
          category: "RESCUE_OPERATION",
          district: "PATHANAMTHITTA",
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 6),
          status: "RESOLVED",
          isPinned: false,
        },
      ],
    });
    console.log("Seeded sample alerts");
  }

  const centreCount = await prisma.collectionCentre.count();
  if (centreCount === 0) {
    await prisma.collectionCentre.create({
      data: {
        name: "Ernakulam District Collection Centre",
        district: "ERNAKULAM",
        region: "Kochi Taluk",
        address: "Civil Station, Kakkanad, Kochi, Ernakulam",
        mapLink: "https://maps.google.com/?q=Civil+Station+Kakkanad",
        contactName: "Rajeev Menon",
        contactDesignation: "Taluk Supply Officer",
        contactPhone: "+914842422001",
        contactAltPhone: "+919447012345",
        workingHours: "8:00 AM - 8:00 PM (all days)",
        remarks: "Accepts food grains, clothing, and medical supplies.",
        officials: {
          create: [
            { name: "Anitha Suresh", designation: "Coordinator", contactNumber: "+919446012345" },
          ],
        },
      },
    });
    console.log("Seeded sample collection centre");
  }

  const campCount = await prisma.reliefCamp.count();
  if (campCount === 0) {
    await prisma.reliefCamp.create({
      data: {
        name: "Government HSS Relief Camp",
        district: "ALAPPUZHA",
        region: "Chengannur Taluk",
        address: "Government Higher Secondary School, Chengannur",
        mapLink: "https://maps.google.com/?q=Govt+HSS+Chengannur",
        contactName: "Suresh Kumar",
        contactDesignation: "Camp Officer",
        contactPhone: "+914792452001",
        remarks: "Housing 120 families as of the latest headcount.",
        officials: {
          create: [
            {
              name: "Dr. Priya Nair",
              designation: "Medical Officer",
              department: "Health",
              contactNumber: "+919447098765",
            },
          ],
        },
        requirements: {
          create: [
            { itemName: "Drinking water (20L cans)", quantity: "150", priority: "HIGH" },
            { itemName: "Baby food", quantity: "40 packets", priority: "HIGH" },
            { itemName: "Bedsheets", quantity: "100", priority: "MEDIUM" },
          ],
        },
      },
    });
    console.log("Seeded sample relief camp");
  }

  const groupCount = await prisma.volunteerGroup.count();
  if (groupCount === 0) {
    await prisma.volunteerGroup.create({
      data: {
        name: "Kochi Youth Relief Collective",
        district: "ERNAKULAM",
        region: "Kochi",
        coordinatorName: "Arjun Pillai",
        coordinatorPhone: "+919400012345",
        whatsappLink: "https://wa.me/919400012345",
        remarks: "Focus on boat rescue and food distribution.",
        officials: {
          create: [
            {
              name: "Meera Thomas",
              designation: "Logistics Lead",
              department: "Logistics",
              contactNumber: "+919400054321",
            },
          ],
        },
      },
    });
    console.log("Seeded sample volunteer group");
  }

  const contactCount = await prisma.emergencyContact.count();
  if (contactCount === 0) {
    await prisma.emergencyContact.createMany({
      data: [
        {
          department: "State Emergency Operations Centre",
          officialName: "Control Room",
          designation: "24x7 Helpline",
          district: "THIRUVANANTHAPURAM",
          phoneNumber: "1077",
        },
        {
          department: "Kerala Police",
          officialName: "Control Room",
          designation: "Emergency Response",
          district: "THIRUVANANTHAPURAM",
          phoneNumber: "100",
        },
        {
          department: "Fire and Rescue Services",
          officialName: "Control Room",
          designation: "Emergency Response",
          district: "THIRUVANANTHAPURAM",
          phoneNumber: "101",
        },
        {
          department: "Ambulance / Medical Emergency",
          officialName: "Control Room",
          designation: "24x7 Helpline",
          district: "THIRUVANANTHAPURAM",
          phoneNumber: "108",
        },
        {
          department: "Ernakulam District Disaster Management Authority",
          officialName: "Control Room",
          designation: "District Helpline",
          district: "ERNAKULAM",
          phoneNumber: "+914842368000",
        },
        {
          department: "Alappuzha District Disaster Management Authority",
          officialName: "Control Room",
          designation: "District Helpline",
          district: "ALAPPUZHA",
          phoneNumber: "+914772251000",
        },
      ],
    });
    console.log("Seeded sample emergency contacts");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
