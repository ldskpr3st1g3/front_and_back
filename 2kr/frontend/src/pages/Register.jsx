import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/auth/register", { username, password });
      alert("Регистрация успешна! Теперь войдите.");
      navigate("/login");
    } catch (error) {
      alert("Ошибка регистрации: " + (error.response?.data?.error || "Пользователь существует"));
    }
  };

  return (
    <div>
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px" }}>
        <input placeholder="Имя пользователя (Логин)" value={username} onChange={e => setUsername(e.target.value)} required style={{ padding: "8px" }} />
        <input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: "8px" }} />
        <button type="submit" style={{ padding: "10px", cursor: "pointer" }}>Зарегистрироваться</button>
      </form>
      <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
    </div>
  );
}