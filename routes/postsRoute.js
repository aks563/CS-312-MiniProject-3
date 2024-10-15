const express = require('express');
const router = express.Router();
const pool = require('db');

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.user) { // check for active session
    return next();
  }
  res.redirect('/signin');
}

// User Registration
router.get('/register', (req, res) => {  // render registaration page upon request
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;  // retreive data
  const userExists = await userNameExists(username);
  
  if (userExists) {
    return res.render('register', { error: 'Username already exists.' });
  }
  
  await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]); // if username isn't taken, store data
  res.redirect('/signin'); // redirect user to sign in
});

// User Sign In
router.get('/signin', (req, res) => { // render signin page upon request
  res.render('signin', { error: null });
});

router.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  const validUser = await checkValidUser(username, password);
  
  if (validUser) {
    req.session.user = username; // Store the user in the session if valid credentials
    res.redirect('/'); // redirect to homepage
  } else {
    res.render('signin', { error: 'Invalid credentials.' });
  }
});

// Display all posts
router.get('/', async (req, res) => {
  const posts = await getPosts();
  res.render('index', { posts, user: req.session.user });
});

// Create new post
router.get('/newPost', isAuthenticated, (req, res) => {
  res.render('newPost');
});

router.post('/newPost', isAuthenticated, async (req, res) => {
  const { title, content } = req.body;
  await pool.query('INSERT INTO posts (title, content, author) VALUES ($1, $2, $3)', [title, content, req.session.user]); // store data in the database
  res.redirect('/');
});

// Edit post
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const post = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
  res.render('edit', { post: post.rows[0] });
});

router.post('/edit/:id', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const { title, content } = req.body;
  await pool.query('UPDATE posts SET title = $1, content = $2 WHERE id = $3', [title, content, postId]); // update data in database
  res.redirect('/');
});

// Delete post
router.post('/delete/:id', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  await pool.query('DELETE FROM posts WHERE id = $1', [postId]); // remove data from database
  res.redirect('/');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(); // end session
  res.redirect('/signin');
});

module.exports = router;

// Check if username exists
const userNameExists = async (username) => {
  try {
    const user = await User.findOne({ username: username }); // Query database to find user by username
    if (user) {
      return true; // Username exists
    }
    return false; // Username does not exist
  } catch (error) {
    console.error('Error checking username:', error);
    throw error;
  }
};

// check if user is logged in / has valid session
const checkValidUser = (req) => {
  if (req.session && req.session.userId) {
    return true;
  }
  return false;
};

const getPosts = async () => {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 }); // render all posts
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};