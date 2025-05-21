const express = require('express');
const path = require('path');
const app = express();
const PORT = 8000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Send the main HTML file for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Invoice Generator app is running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server`);
}); 