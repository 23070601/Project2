const { pool } = require('../../config/db');

let columnsChecked = false;
async function ensureClassroomColumns() {
  if (columnsChecked) return;
  try {
    await pool.query("ALTER TABLE Classrooms ADD COLUMN image_url VARCHAR(500) NULL");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE Classrooms ADD COLUMN capacity INT NULL");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE Classrooms ADD COLUMN status VARCHAR(50) DEFAULT 'Available'");
  } catch (e) {}
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ClassroomImages (
        image_id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_classroom_images_room (room_id)
      ) ENGINE=InnoDB
    `);
  } catch (e) {}
  columnsChecked = true;
}

async function saveClassroomImages(roomId, imagePaths) {
  if (!imagePaths || imagePaths.length === 0) return;
  await ensureClassroomColumns();
  const values = imagePaths.map(p => [roomId, p]);
  try {
    await pool.query('INSERT INTO ClassroomImages (room_id, image_path) VALUES ?', [values]);
  } catch (e) {
    console.warn('Failed to insert into ClassroomImages:', e.message);
  }
}

async function getClassroomImagesMap(roomIds) {
  if (!roomIds || roomIds.length === 0) return {};
  await ensureClassroomColumns();
  try {
    const [rows] = await pool.query(
      'SELECT room_id, image_path FROM ClassroomImages WHERE room_id IN (?) ORDER BY image_id ASC',
      [roomIds]
    );
    const map = {};
    for (const r of rows) {
      if (!map[r.room_id]) map[r.room_id] = [];
      map[r.room_id].push(r.image_path);
    }
    return map;
  } catch (e) {
    return {};
  }
}

async function findAll({ search } = {}) {
  await ensureClassroomColumns();
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('room_name LIKE ?');
    params.push(`%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM Assets a WHERE a.room_id = c.room_id) AS asset_count
     FROM Classrooms c ${where} ORDER BY c.room_name`,
    params
  );

  if (rows.length > 0) {
    const roomIds = rows.map(r => r.room_id);
    const imagesMap = await getClassroomImagesMap(roomIds);
    for (const room of rows) {
      const imgList = imagesMap[room.room_id] || [];
      if (room.image_url && !imgList.includes(room.image_url)) {
        imgList.unshift(room.image_url);
      }
      room.images = imgList;
      room.image_url = imgList[0] || room.image_url || null;
    }
  }

  return rows;
}

async function findById(roomId) {
  await ensureClassroomColumns();
  const [rows] = await pool.execute('SELECT * FROM Classrooms WHERE room_id = ?', [roomId]);
  if (!rows[0]) return null;
  const room = rows[0];
  const imagesMap = await getClassroomImagesMap([roomId]);
  const imgList = imagesMap[roomId] || [];
  if (room.image_url && !imgList.includes(room.image_url)) {
    imgList.unshift(room.image_url);
  }
  room.images = imgList;
  room.image_url = imgList[0] || room.image_url || null;
  return room;
}

async function findByName(roomName) {
  await ensureClassroomColumns();
  const [rows] = await pool.execute('SELECT * FROM Classrooms WHERE room_name = ?', [roomName]);
  return rows[0] || null;
}

async function create({ roomName, qrCode = null, capacity = null, status = 'Available', imageUrl = null, image_url = null, imagePaths = [] }) {
  await ensureClassroomColumns();
  const allImages = [...imagePaths];
  const primaryImg = imageUrl || image_url || allImages[0] || null;

  const [result] = await pool.execute(
    'INSERT INTO Classrooms (room_name, qr_code, capacity, status, image_url) VALUES (?, ?, ?, ?, ?)',
    [roomName, qrCode, capacity, status, primaryImg]
  );
  
  const roomId = result.insertId;
  if (allImages.length > 0) {
    await saveClassroomImages(roomId, allImages);
  }

  return findById(roomId);
}

async function update(roomId, { roomName, qrCode, capacity, status, imageUrl, image_url, imagePaths }) {
  await ensureClassroomColumns();
  const img = imageUrl !== undefined ? imageUrl : image_url;
  const fields = [];
  const params = [];
  if (roomName !== undefined) { fields.push('room_name = ?'); params.push(roomName); }
  if (qrCode !== undefined) { fields.push('qr_code = ?'); params.push(qrCode); }
  if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (img !== undefined) { fields.push('image_url = ?'); params.push(img); }

  if (fields.length > 0) {
    params.push(roomId);
    await pool.execute(`UPDATE Classrooms SET ${fields.join(', ')} WHERE room_id = ?`, params);
  }

  if (imagePaths && imagePaths.length > 0) {
    await saveClassroomImages(roomId, imagePaths);
  }

  return findById(roomId);
}

async function updateQrCode(roomId, qrCode) {
  await pool.execute('UPDATE Classrooms SET qr_code = ? WHERE room_id = ?', [qrCode, roomId]);
  return findById(roomId);
}

async function remove(roomId) {
  await pool.execute('DELETE FROM Classrooms WHERE room_id = ?', [roomId]);
}

module.exports = { findAll, findById, findByName, create, update, updateQrCode, remove };

