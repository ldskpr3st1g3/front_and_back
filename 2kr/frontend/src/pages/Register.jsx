import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "user",
  });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await apiClient.post("/auth/register", formData);
      alert("Регистрация успешна");
      navigate("/login");
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка регистрации");
    }
  };

  return (
    <div>
      <h2>Регистрация</h2>
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
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
          style={{ padding: "8px" }}
        />
        <input
          placeholder="Пароль"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
          style={{ padding: "8px" }}
        />
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          style={{ padding: "8px" }}
        >
          <option value="user">Пользователь</option>
          <option value="seller">Продавец</option>
          <option value="admin">Администратор</option>
        </select>
        <button type="submit" style={{ padding: "10px" }}>
          Зарегистрироваться
        </button>
      </form>
      <p>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
