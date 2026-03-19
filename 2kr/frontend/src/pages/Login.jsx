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
      const { data } = await apiClient.post("/auth/login", { username, password });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      navigate("/"); // Переходим в магазин
    } catch (error) {
      alert("Ошибка входа: Неверный логин или пароль");
    }
  };

  return (
    <div>
      <h2>Вход в систему</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px" }}>
        <input placeholder="Имя пользователя (Логин)" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: "8px" }}/>
        <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: "8px" }}/>
        <button type="submit" style={{ padding: "10px", cursor: "pointer" }}>Войти</button>
      </form>
      <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
    </div>
  );
}