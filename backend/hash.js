const bcrypt = require('bcryptjs');

(async () => {
  console.log("Manager:", await bcrypt.hash("123456", 10));
  console.log("Technician:", await bcrypt.hash("123456", 10));
  console.log("User:", await bcrypt.hash("123456", 10));
})();