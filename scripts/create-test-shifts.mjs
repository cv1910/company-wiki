// Script to create test shifts for different locations
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Get locations
    const [locations] = await connection.execute('SELECT id, name, shortName FROM locations ORDER BY sortOrder');
    console.log('Locations:', locations);
    
    // Get first user (admin)
    const [users] = await connection.execute('SELECT id, name FROM users LIMIT 3');
    console.log('Users:', users);
    
    // Get teams
    const [teams] = await connection.execute('SELECT id, name FROM teams LIMIT 1');
    console.log('Teams:', teams);
    
    if (locations.length === 0 || users.length === 0) {
      console.log('No locations or users found');
      return;
    }
    
    const teamId = teams.length > 0 ? teams[0].id : null;
    
    // Create test shifts for this week
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    const shifts = [];
    
    // For each location, create shifts on different days
    for (let i = 0; i < locations.length && i < 3; i++) {
      const loc = locations[i];
      const user = users[i % users.length];
      
      // Create shifts for Mon, Tue, Wed for each location
      for (let day = 0; day < 3; day++) {
        const shiftDate = new Date(monday);
        shiftDate.setDate(monday.getDate() + day + (i * 2)); // Spread across the week
        
        if (shiftDate.getDay() === 0 || shiftDate.getDay() === 6) continue; // Skip weekends
        
        const startDate = new Date(shiftDate);
        startDate.setHours(9 + (i * 2), 0, 0, 0); // Different start times
        
        const endDate = new Date(shiftDate);
        endDate.setHours(17 + (i * 2), 0, 0, 0);
        
        const colors = ['blue', 'green', 'orange'];
        const shiftTypes = ['Frühschicht', 'Tagschicht', 'Spätschicht'];
        
        shifts.push({
          title: `${shiftTypes[i % 3]} - ${loc.shortName}`,
          description: `Test-Schicht für ${loc.name}`,
          startDate: startDate.toISOString().slice(0, 19).replace('T', ' '),
          endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),
          isAllDay: false,
          color: colors[i % 3],
          eventType: 'shift',
          location: loc.id.toString(),
          teamId: teamId,
          userId: user.id,
        });
      }
    }
    
    console.log('Creating shifts:', shifts.length);
    
    for (const shift of shifts) {
      await connection.execute(
        `INSERT INTO calendarEvents (title, description, startDate, endDate, isAllDay, color, eventType, location, teamId, userId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [shift.title, shift.description, shift.startDate, shift.endDate, shift.isAllDay, shift.color, shift.eventType, shift.location, shift.teamId, shift.userId]
      );
      console.log(`Created shift: ${shift.title}`);
    }
    
    console.log('Done!');
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
