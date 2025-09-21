import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'

function App(){
  const isAuthenticated = !!localStorage.getItem('token');
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };
   return (
    <Router>
      <nav>
      <Link to="/">Home</Link> | {' '}
      {isAuthenticated ? (
        <>
          <Link to="/sell">Sell a Book</Link> | {' '}
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link> | {' '}
          <Link to="/signup">Sign Up</Link>
        </>
      )}
      </nav>
      <main>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Signup />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
