const { initDatabase, prepare, saveDatabase } = require('../src/db');

const mockJobs = [
    {
        id: 'JOB-2025001',
        title: '人員招募專員',
        department: '人資部',
        publish_date: '2025-11-20',
        status: 'published',
        recruiter: 'HR Admin'
    },
    {
        id: 'JOB-2025002',
        title: '主辦會計',
        department: '財務部',
        publish_date: '2025-11-18',
        status: 'published',
        recruiter: 'HR Admin'
    },
    {
        id: 'JOB-2025003',
        title: '人資專員',
        department: '人資部',
        publish_date: '2025-11-15',
        status: 'published',
        recruiter: 'HR Admin'
    },
    {
        id: 'JOB-2025004',
        title: '專案部副理',
        department: '專案部',
        publish_date: null,
        status: 'review',
        recruiter: 'HR Admin'
    },
    {
        id: 'JOB-2025005',
        title: '薪酬與福利專員',
        department: '人資部',
        publish_date: null,
        status: 'draft',
        recruiter: 'HR Admin'
    },
    {
        id: 'JOB-2025006',
        title: '出納會計',
        department: '財務部',
        publish_date: '2025-11-10',
        status: 'published',
        recruiter: 'HR Admin'
    }
];

async function seed() {
    console.log('Initializing database...');
    await initDatabase();

    console.log('Seeding jobs...');
    let count = 0;

    for (const job of mockJobs) {
        const existing = prepare('SELECT id FROM jobs WHERE id = ?').get(job.id);
        if (!existing) {
            prepare(`
        INSERT INTO jobs (id, title, department, publish_date, status, recruiter, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, 'local_only')
      `).run(
                job.id,
                job.title,
                job.department,
                job.publish_date,
                job.status,
                job.recruiter
            );
            console.log(`Inserted: ${job.title} (${job.id})`);
            count++;
        } else {
            console.log(`Skipped (exists): ${job.title} (${job.id})`);
        }
    }

    saveDatabase();
    console.log(`Seed completed. Added ${count} jobs.`);
}

seed().catch(console.error);
