// Seed script for org chart example data
import { getDb } from "./db";
import { orgPositions } from "../drizzle/schema";

export async function seedOrgChart(createdById: number) {
  const db = await getDb();
  if (!db) {
    console.log("Database not available, skipping seed");
    return;
  }

  // Check if data already exists
  const existing = await db.select().from(orgPositions).limit(1);
  if (existing.length > 0) {
    console.log("Org chart data already exists, skipping seed");
    return;
  }

  // CEO
  const ceoResult = await db.insert(orgPositions).values({
    title: "CEO",
    department: "Geschäftsführung",
    description: "Chief Executive Officer - Gesamtverantwortung für das Unternehmen",
    parentId: null,
    sortOrder: 0,
    level: 0,
    color: "orange",
    createdById,
  }).$returningId();
  const ceoId = ceoResult[0].id;

  // Department Heads
  const departments = [
    { title: "Head of HR", department: "Human Resources", description: "Leitung Personal und Recruiting", color: "green" },
    { title: "Head of IT", department: "IT & Entwicklung", description: "Leitung IT-Infrastruktur und Softwareentwicklung", color: "blue" },
    { title: "Head of Marketing", department: "Marketing", description: "Leitung Marketing und Kommunikation", color: "purple" },
    { title: "Head of Sales", department: "Vertrieb", description: "Leitung Vertrieb und Kundenbeziehungen", color: "teal" },
    { title: "CFO", department: "Finanzen", description: "Chief Financial Officer - Leitung Finanzen und Controlling", color: "amber" },
  ];

  const departmentHeads: { id: number; department: string }[] = [];

  for (let i = 0; i < departments.length; i++) {
    const dept = departments[i];
    const result = await db.insert(orgPositions).values({
      title: dept.title,
      department: dept.department,
      description: dept.description,
      parentId: ceoId,
      sortOrder: i,
      level: 1,
      color: dept.color,
      createdById,
    }).$returningId();
    departmentHeads.push({ id: result[0].id, department: dept.department });
  }

  // Team Leads under each department
  const teamLeads = [
    // HR
    { title: "Recruiting Manager", department: "Human Resources", parentDept: "Human Resources", color: "green" },
    { title: "HR Business Partner", department: "Human Resources", parentDept: "Human Resources", color: "green" },
    // IT
    { title: "Lead Developer", department: "IT & Entwicklung", parentDept: "IT & Entwicklung", color: "blue" },
    { title: "DevOps Engineer", department: "IT & Entwicklung", parentDept: "IT & Entwicklung", color: "blue" },
    { title: "UX Designer", department: "IT & Entwicklung", parentDept: "IT & Entwicklung", color: "blue" },
    // Marketing
    { title: "Content Manager", department: "Marketing", parentDept: "Marketing", color: "purple" },
    { title: "Social Media Manager", department: "Marketing", parentDept: "Marketing", color: "purple" },
    // Sales
    { title: "Key Account Manager", department: "Vertrieb", parentDept: "Vertrieb", color: "teal" },
    { title: "Sales Representative", department: "Vertrieb", parentDept: "Vertrieb", color: "teal" },
    // Finance
    { title: "Controller", department: "Finanzen", parentDept: "Finanzen", color: "amber" },
    { title: "Accountant", department: "Finanzen", parentDept: "Finanzen", color: "amber" },
  ];

  for (let i = 0; i < teamLeads.length; i++) {
    const lead = teamLeads[i];
    const parent = departmentHeads.find(d => d.department === lead.parentDept);
    if (parent) {
      await db.insert(orgPositions).values({
        title: lead.title,
        department: lead.department,
        description: `${lead.title} im Bereich ${lead.department}`,
        parentId: parent.id,
        sortOrder: i,
        level: 2,
        color: lead.color,
        createdById,
      });
    }
  }

  console.log("Org chart seeded successfully with example data");
}
