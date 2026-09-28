const mongoose = require('mongoose');
const dns = require('dns');

// Node's own DNS resolver can get ECONNREFUSED on querySrv when the
// local/router DNS server doesn't handle direct queries well (common on
// Windows). Point it at public resolvers so mongodb+srv:// lookups work.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    mongoose.connection.on('connected',()=> console.log('Database connected'));
        await mongoose.connect(`${process.env.MONGODB_URI}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

