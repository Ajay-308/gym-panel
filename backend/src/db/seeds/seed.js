/* eslint-disable no-console */
const pool = require("../pool");

const GYM_ROWS = [
  {
    name: "Aj gym — Sangam Vihar",
    city: "New Delhi",
    capacity: 220,
    opens_at: "05:30",
    closes_at: "22:30",
  },
  {
    name: "Aj gym — Nehru Place",
    city: "New Delhi",
    capacity: 180,
    opens_at: "06:00",
    closes_at: "22:00",
  },
  {
    name: "Aj gym — Okhla",
    city: "New Delhi",
    capacity: 300,
    opens_at: "05:00",
    closes_at: "23:00",
  },
  {
    name: "Aj gym — Sukhdev Vihar",
    city: "New Delhi",
    capacity: 250,
    opens_at: "05:30",
    closes_at: "22:30",
  },
  {
    name: "Aj gym — Dwarka",
    city: "New Delhi",
    capacity: 200,
    opens_at: "05:30",
    closes_at: "22:00",
  },
  {
    name: "Aj gym — Rohini",
    city: "New Delhi",
    capacity: 180,
    opens_at: "06:00",
    closes_at: "22:00",
  },
  {
    name: "Aj gym — Rajouri Garden",
    city: "New Delhi",
    capacity: 160,
    opens_at: "06:00",
    closes_at: "22:00",
  },
  {
    name: "Aj gym — Laxmi Nagar",
    city: "New Delhi",
    capacity: 140,
    opens_at: "06:00",
    closes_at: "21:30",
  },
  {
    name: "Aj gym — Mayur Vihar",
    city: "New Delhi",
    capacity: 120,
    opens_at: "06:00",
    closes_at: "21:00",
  },
  {
    name: "Aj gym — Vasant Kunj",
    city: "New Delhi",
    capacity: 110,
    opens_at: "06:00",
    closes_at: "21:00",
  },
];

const MEMBER_COUNTS = [650, 550, 750, 600, 550, 500, 450, 400, 300, 250];

const PLAN_SPLIT = [
  { m: 0.5, q: 0.3, a: 0.2 },
  { m: 0.4, q: 0.4, a: 0.2 },
  { m: 0.4, q: 0.4, a: 0.2 },
  { m: 0.4, q: 0.4, a: 0.2 },
  { m: 0.4, q: 0.4, a: 0.2 },
  { m: 0.4, q: 0.4, a: 0.2 },
  { m: 0.5, q: 0.3, a: 0.2 },
  { m: 0.6, q: 0.25, a: 0.15 },
  { m: 0.6, q: 0.3, a: 0.1 },
  { m: 0.6, q: 0.3, a: 0.1 },
];

const ACTIVE_PCT = [0.88, 0.85, 0.9, 0.87, 0.89, 0.86, 0.84, 0.82, 0.8, 0.78];

const NAMES = [
  "Rahul Sharma", "Priya Mehta", "Ankit Verma", "Neha Gupta", "Arjun Patel",
  "Kavya Singh", "Vikram Reddy", "Divya Iyer", "Rohan Joshi", "Sneha Nair",
  "Amit Kumar", "Pooja Shah", "Karan Malhotra", "Isha Kapoor", "Nikhil Rao",
  "Tanvi Desai", "Manish Kulkarni", "Shruti Menon", "Aditya Bose", "Meera Pillai",
  "Sanjay Agarwal", "Ananya Ghosh", "Harsh Tiwari", "Ritika Saxena", "Varun Chopra",
  "Simran Kaur", "Kunal Bhatia", "Deepika Jain", "Yash Pandey", "Aishwarya Sen",
  "Ravi Krishnan", "Lakshmi Narayan", "Suresh Venkat", "Kavitha Raman", "Gautham S",
  "Harini Subramanian", "Prakash Naidu", "Sunita Devi", "Rajesh Khanna", "Fatima Khan",
  "Imran Syed", "Zara Ali", "Omar Hassan", "Ayesha Begum", "Farhan Qureshi",
  "Dev Patel", "Riya Shah", "Krishna Iyer", "Lalita Rao", "Mohan Das",
  "Geeta Kumari", "Vinod Sharma", "Seema Rani", "Alok Mishra", "Bharti Sinha",
  "Chirag Modi", "Disha Parmar", "Esha Trivedi", "Faisal Mirza", "Gauri Thakur",
  "Hemant Joshi", "Indira Bose", "Jayesh Naik", "Kiran Bedi", "Leela Krishnan",
  "Mahesh Gowda", "Nandini Shetty", "Omkar Hegde", "Pallavi Rao", "Qureshi Asif",
  "Ramesh Babu", "Sarita Devi", "Tarun Reddy", "Uma Shankar", "Vishal Anand",
  "Yamini Sood", "Zubin Irani", "Abhishek Roy", "Bhavna Sethi", "Chetan Oberoi",
];

const DOW_MULT = [0.45, 1.0, 0.95, 0.9, 0.95, 0.85, 0.7];

const HOUR_WEIGHTS = [];
for (let h = 0; h < 24; h++) {
  let w = 0;
  if (h < 5) w = 0;
  else if (h === 5) w = 0.6;
  else if (h === 6) w = 0.6;
  else if (h >= 7 && h <= 9) w = 1.0;
  else if (h >= 10 && h <= 11) w = 0.4;
  else if (h >= 12 && h <= 13) w = 0.3;
  else if (h >= 14 && h <= 16) w = 0.2;
  else if (h >= 17 && h <= 20) w = 0.9;
  else if (h >= 21 && h <= 22) w = 0.35;
  else w = 0;
  HOUR_WEIGHTS.push(w);
}

function pickHour() {
  let sum = 0;
  for (let h = 5; h <= 22; h++) sum += HOUR_WEIGHTS[h];
  let r = Math.random() * sum;
  for (let h = 5; h <= 22; h++) {
    r -= HOUR_WEIGHTS[h];
    if (r <= 0) return h;
  }
  return 18;
}

function planAmount(plan) {
  if (plan === "monthly") return 1499.0;
  if (plan === "quarterly") return 3999.0;
  return 11999.0;
}

function planDurationDays(plan) {
  if (plan === "monthly") return 30;
  if (plan === "quarterly") return 90;
  return 365;
}

async function insertCheckinsBatch(client, rows) {
  if (!rows.length) return;
  const chunk = 150;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const vals = [];
    const params = [];
    let p = 1;
    for (const r of part) {
      vals.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(r.member_id, r.gym_id, r.checked_in, r.checked_out);
    }
    await client.query(
      `INSERT INTO checkins (member_id, gym_id, checked_in, checked_out) VALUES ${vals.join(",")}`,
      params,
    );
  }
}

async function runSeed() {
  const client = await pool.connect();
  try {
    const { rows: gc } = await client.query("SELECT COUNT(*)::int AS c FROM gyms");
    const { rows: mc } = await client.query("SELECT COUNT(*)::int AS c FROM members");
    if (gc[0].c === 10 && mc[0].c === 5000) {
      console.log("Seeding: dataset already present, skipping.");
      return;
    }

    console.log("Seeding gyms...");
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE anomalies, checkins, payments, members, gyms RESTART IDENTITY CASCADE",
    );

    const gymIds = [];
    for (const g of GYM_ROWS) {
      const ins = await client.query(
        `INSERT INTO gyms (name, city, capacity, status, opens_at, closes_at)
         VALUES ($1, $2, $3, 'active', $4, $5) RETURNING id`,
        [g.name, g.city, g.capacity, g.opens_at, g.closes_at],
      );
      gymIds.push(ins.rows[0].id);
    }
    console.log("Seeding gyms... done");

    console.log("Seeding 5000 members...");
    const members = [];
    let emailCounter = 0;
    for (let gi = 0; gi < 10; gi++) {
      const n = MEMBER_COUNTS[gi];
      const split = PLAN_SPLIT[gi];
      const activeN = Math.round(n * ACTIVE_PCT[gi]);
      const inactiveN = Math.round(n * 0.08);
      const frozenN = n - activeN - inactiveN;
      const monthlyN = Math.round(n * split.m);
      const quarterlyN = Math.round(n * split.q);
      const annualN = n - monthlyN - quarterlyN;

      const plans = [
        ...Array(monthlyN).fill("monthly"),
        ...Array(quarterlyN).fill("quarterly"),
        ...Array(annualN).fill("annual"),
      ];
      while (plans.length < n) plans.push("monthly");
      plans.length = n;
      for (let i = plans.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [plans[i], plans[j]] = [plans[j], plans[i]];
      }

      const statuses = [
        ...Array(activeN).fill("active"),
        ...Array(inactiveN).fill("inactive"),
        ...Array(frozenN).fill("frozen"),
      ];
      while (statuses.length < n) statuses.push("active");
      statuses.length = n;
      for (let i = statuses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
      }

      for (let i = 0; i < n; i++) {
        const plan = plans[i];
        const status = statuses[i];
        const member_type = Math.random() < 0.8 ? "new" : "renewal";
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        emailCounter += 1;
        const email = `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1]?.toLowerCase() || "user"}${emailCounter}@gmail.com`;
        const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

        const now = new Date();
        let joined;
        if (status === "active") {
          joined = new Date(
            now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000,
          );
        } else {
          joined = new Date(
            now.getTime() - (91 + Math.random() * 90) * 24 * 60 * 60 * 1000,
          );
        }
        const exp = new Date(joined);
        exp.setDate(exp.getDate() + planDurationDays(plan));

        members.push({
          gym_id: gymIds[gi],
          name,
          email,
          phone,
          plan_type: plan,
          member_type,
          status,
          joined_at: joined,
          plan_expires_at: exp,
          gym_index: gi,
        });
      }
    }

    const memberChunks = 80;
    const idByKey = [];
    for (let i = 0; i < members.length; i += memberChunks) {
      const slice = members.slice(i, i + memberChunks);
      const vals = [];
      const params = [];
      let p = 1;
      for (const m of slice) {
        vals.push(
          `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`,
        );
        params.push(
          m.gym_id,
          m.name,
          m.email,
          m.phone,
          m.plan_type,
          m.member_type,
          m.status,
          m.joined_at,
          m.plan_expires_at,
          null,
        );
      }
      const res = await client.query(
        `INSERT INTO members (gym_id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at, last_checkin_at)
         VALUES ${vals.join(",")} RETURNING id, gym_id`,
        params,
      );
      for (const row of res.rows) idByKey.push(row);
    }
    const memberIdsByGym = Array.from({ length: 10 }, () => []);
    for (let idx = 0; idx < idByKey.length; idx++) {
      const gid = idByKey[idx].gym_id;
      const gi = gymIds.indexOf(gid);
      memberIdsByGym[gi].push(idByKey[idx].id);
    }
    const memberRowById = new Map();
    for (let i = 0; i < idByKey.length; i++) {
      memberRowById.set(idByKey[i].id, members[i]);
    }

    console.log("Seeding 5000 members... done");
    console.log("Seeding 90 days of check-ins...");

    const now = new Date();
    // Sparse recent check-ins for gym index 9 (Vasant Kunj).
    const velCutoff = new Date(now.getTime() - (2 * 60 + 10) * 60 * 1000);
    const revenueScenarioGymId = gymIds[8];

    const checkinRows = [];
    const OPEN_TARGETS = [
      { gi: 2, count: 282 },
      { gi: 3, count: 12 },
      { gi: 0, count: 12 },
      { gi: 1, count: 8 },
      { gi: 4, count: 10 },
      { gi: 5, count: 8 },
      { gi: 6, count: 8 },
      { gi: 7, count: 6 },
      { gi: 8, count: 4 },
    ];

    const totalOpen = OPEN_TARGETS.reduce((s, t) => s + t.count, 0);
    const TARGET_CLOSED = 270000 - totalOpen;

    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    startDay.setDate(startDay.getDate() - 90);

    let closedCount = 0;
    while (closedCount < TARGET_CLOSED) {
      const gi = Math.floor(Math.random() * 10);
      const dayOff = Math.floor(Math.random() * 90);
      const day = new Date(startDay);
      day.setDate(day.getDate() + dayOff);
      const dow = day.getDay();
      if (Math.random() > DOW_MULT[dow]) continue;

      const hour = pickHour();
      const minute = Math.floor(Math.random() * 60);
      const checked_in = new Date(day);
      checked_in.setHours(hour, minute, Math.floor(Math.random() * 60), 0);

      if (checked_in > now) continue;
      if (gi === 9 && checked_in > velCutoff) continue;

      const mids = memberIdsByGym[gi].filter((id) => {
        const m = memberRowById.get(id);
        return m && m.status === "active";
      });
      if (!mids.length) continue;
      const member_id = mids[Math.floor(Math.random() * mids.length)];
      const dur = 45 + Math.floor(Math.random() * 46);
      const checked_out = new Date(checked_in.getTime() + dur * 60 * 1000);
      if (checked_out > now) continue;

      checkinRows.push({
        member_id,
        gym_id: gymIds[gi],
        checked_in,
        checked_out,
      });
      closedCount += 1;
      if (checkinRows.length >= 800) {
        await insertCheckinsBatch(client, checkinRows);
        checkinRows.length = 0;
      }
    }
    await insertCheckinsBatch(client, checkinRows);
    checkinRows.length = 0;

    const globallyUsedOpen = new Set();
    for (const { gi, count } of OPEN_TARGETS) {
      const mids = memberIdsByGym[gi].filter((id) => {
        const m = memberRowById.get(id);
        return m && m.status === "active";
      });
      for (let k = 0; k < count; k++) {
        let member_id;
        let guard = 0;
        do {
          member_id = mids[Math.floor(Math.random() * mids.length)];
          guard += 1;
        } while (globallyUsedOpen.has(member_id) && guard < 80);
        globallyUsedOpen.add(member_id);
        const minsAgo = Math.floor(Math.random() * 85) + 5;
        const checked_in = new Date(now.getTime() - minsAgo * 60 * 1000);
        checkinRows.push({
          member_id,
          gym_id: gymIds[gi],
          checked_in,
          checked_out: null,
        });
      }
    }
    await insertCheckinsBatch(client, checkinRows);

    await client.query(`
      UPDATE members m SET last_checkin_at = x.mx
      FROM (
        SELECT member_id, MAX(checked_in) AS mx FROM checkins GROUP BY member_id
      ) x WHERE m.id = x.member_id
    `);

    const activeIds = idByKey
      .map((r, idx) => r.id)
      .filter((id) => memberRowById.get(id).status === "active")
      .filter((id) => !globallyUsedOpen.has(id));

    const shuffled = activeIds.sort(() => Math.random() - 0.5);
    const churnHigh = shuffled.slice(0, 170);
    const churnCrit = shuffled.slice(170, 170 + 90);
    const churnAll = [...churnHigh, ...churnCrit];

    if (churnAll.length) {
      await client.query(`DELETE FROM checkins WHERE member_id = ANY($1::uuid[])`, [
        churnAll,
      ]);
    }

    for (const id of churnHigh) {
      const m = memberRowById.get(id);
      const days = 45 + Math.floor(Math.random() * 15);
      const ts = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO checkins (member_id, gym_id, checked_in, checked_out) VALUES ($1,$2,$3,$4)`,
        [id, m.gym_id, ts, new Date(ts.getTime() + 60 * 60 * 1000)],
      );
    }
    for (const id of churnCrit) {
      const m = memberRowById.get(id);
      const days = 61 + Math.floor(Math.random() * 20);
      const ts = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO checkins (member_id, gym_id, checked_in, checked_out) VALUES ($1,$2,$3,$4)`,
        [id, m.gym_id, ts, new Date(ts.getTime() + 70 * 60 * 1000)],
      );
    }

    await client.query(`
      UPDATE members m SET last_checkin_at = x.mx
      FROM (
        SELECT member_id, MAX(checked_in) AS mx FROM checkins GROUP BY member_id
      ) x WHERE m.id = x.member_id
    `);

    console.log("Seeding 90 days of check-ins... done");
    console.log("Seeding payments...");

    for (let idx = 0; idx < idByKey.length; idx++) {
      const mid = idByKey[idx].id;
      const m = members[idx];
      const amt = planAmount(m.plan_type);
      await client.query(
        `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [mid, m.gym_id, amt, m.plan_type, "new", m.joined_at],
      );
      if (m.member_type === "renewal") {
        const second = new Date(m.joined_at);
        second.setDate(second.getDate() + planDurationDays(m.plan_type));
        await client.query(
          `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [mid, m.gym_id, amt, m.plan_type, "renewal", second],
        );
      }
    }

    const lw = new Date(now);
    lw.setDate(lw.getDate() - 7);
    lw.setHours(11, 0, 0, 0);
    const revenueScenarioMembers = idByKey
      .map((r, i) => ({ id: r.id, gym_id: members[i].gym_id }))
      .filter((m) => m.gym_id === revenueScenarioGymId)
      .slice(0, 12);
    let revenueScenarioSum = 0;
    for (let i = 0; i < 9; i++) {
      const amt = 1499.0 + i * 200;
      revenueScenarioSum += amt;
      const pt = new Date(lw.getTime() + i * 15 * 60 * 1000);
      await client.query(
        `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
         VALUES ($1,$2,$3,'monthly','new',$4)`,
        [revenueScenarioMembers[i % revenueScenarioMembers.length].id, revenueScenarioGymId, amt, pt],
      );
    }
    if (revenueScenarioSum < 15000) {
      await client.query(
        `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
         VALUES ($1,$2,3999,'quarterly','new',$3)`,
        [revenueScenarioMembers[0].id, revenueScenarioGymId, new Date(lw.getTime() + 3 * 3600000)],
      );
    }

    await client.query(
      `DELETE FROM payments WHERE gym_id = $1 AND paid_at::date = CURRENT_DATE`,
      [revenueScenarioGymId],
    );
    await client.query(
      `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at)
       VALUES ($1,$2,1499,'monthly','new', NOW() - INTERVAL '30 minutes')`,
      [revenueScenarioMembers[1].id, revenueScenarioGymId],
    );

    await client.query("COMMIT");
    console.log("Seeding payments... done");

    try {
      await pool.query("REFRESH MATERIALIZED VIEW gym_hourly_stats");
    } catch (e) {
      console.warn("MV refresh after seed:", e.message);
    }
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", e);
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { runSeed };
