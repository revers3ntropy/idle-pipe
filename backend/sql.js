const mysql = require('mysql');
require('dotenv').config();

const dbConfig = {
	host     : process.env.DB_HOST,
	user     : process.env.DB_USER,
	password : process.env.DB_PASSWORD,
	database : process.env.DB_DATABASE,
};

let con;

let hasConnectedSQL = false;

/**
 *   Queries the mySQL database
 *
 *   @param {string} sql The SQL query
 *   @returns {Promise} Has connected yet
 */
exports.query = (sql) => new Promise((resolve, reject) => {
	if (!hasConnectedSQL) reject('Not Connected');

	con.query(sql, (err, result) => {
		if (err) reject(err);

		resolve(result);
	});
});


/**
 * brings the SQL connection back online when it periodically disconnections.
 * Note: recursively called on error
 */
function handleDisconnect() {
	con = mysql.createConnection(dbConfig); // Recreate the connection, since
											// the old one cannot be reused.

	con.connect(err => {                     // The server is either down
		if (err) {                                     // or restarting (takes a while sometimes).
			console.log('error when connecting to db:', err);
			setTimeout(handleDisconnect, 500); // We introduce a delay before attempting to reconnect,
		}

		console.log("Connected to SQL server");
		hasConnectedSQL = true;// to avoid a hot loop, and to allow our node script to
	});                                     // process asynchronous requests in the meantime.
											// If you're also serving http, display a 503 error.
	con.on('error', err => {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') // Connection to the MySQL server is usually
			handleDisconnect();                         // lost due to either server restart, or a
		else                                         // connnection idle timeout (the wait_timeout
			throw err;                                  // server variable configures this)
	});
}

handleDisconnect();