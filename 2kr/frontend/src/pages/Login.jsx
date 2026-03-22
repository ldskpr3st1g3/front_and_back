import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await apiClient.post("/auth/login", {
        username,
        password,
      });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка входа");
    }
  };

  return (
    <div>
      <h2>Вход</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "300px",
        }}
      >
        <input
          placeholder="Логин"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ padding: "8px" }}
        />
        <input
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "8px" }}
        />
        <button type="submit" style={{ padding: "10px" }}>
          Войти
        </button>
      </form>
      <p>
        Нет аккаунта? <Link to="/register">Регистрация</Link>
      </p>
      <div style={{ marginTop: "20px" }}>
        <p>
          <b>Тестовые аккаунты:</b>
        </p>
        <p>admin / admin123</p>
        <p>seller / seller123</p>
        <p>user / user123</p>
      </div>
    </div>
  );
}
