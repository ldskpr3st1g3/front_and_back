import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function UserForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    role: "user",
    password: "",
  });

  useEffect(() => {
    apiClient
      .get(`/users/${id}`)
      .then(({ data }) =>
        setFormData({
          username: data.username,
          role: data.role,
          password: "",
        }),
      )
      .catch(() => {
        alert("Не удалось загрузить пользователя");
        navigate("/users");
      });
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        username: formData.username,
        role: formData.role,
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      await apiClient.put(`/users/${id}`, payload);
      navigate("/users");
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка обновления");
    }
  };

  return (
    <div>
      <h2>Редактирование пользователя</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "350px",
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

        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          style={{ padding: "8px" }}
        >
          <option value="user">Пользователь</option>
          <option value="seller">Продавец</option>
          <option value="admin">Администратор</option>
        </select>

        <input
          placeholder="Новый пароль (необязательно)"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          style={{ padding: "8px" }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" style={{ padding: "10px", flex: 1 }}>
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => navigate("/users")}
            style={{ padding: "10px", flex: 1 }}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
