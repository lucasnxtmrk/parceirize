const bcrypt = require("bcryptjs");
bcrypt.hash("12345678", 10).then(console.log);