import { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../css/login.css';

function Login() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        if (data.role === "driver") {
          navigate("/driver-dashboard");
        } else if (data.role === "depo-master") {
          navigate("/depo-master-dashboard");
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Error logging in");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input type="text" id="username" name="username" placeholder="Enter username" required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" name="password" placeholder="Enter password" required />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
