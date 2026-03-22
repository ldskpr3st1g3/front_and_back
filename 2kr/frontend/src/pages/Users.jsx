import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function Users() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const { data } = await apiClient.get("/users");
      setUsers(data);
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка загрузки пользователей");
      navigate("/");
    }
  };

  const handleBlock = async (id) => {
    if (!window.confirm("Заблокировать пользователя?")) return;

    try {
      await apiClient.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка блокировки");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2>Пользователи</h2>
        <button onClick={() => navigate("/")}>Назад в магазин</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "10px" }}>ID</th>
            <th style={{ border: "1px solid #ccc", padding: "10px" }}>Логин</th>
            <th style={{ border: "1px solid #ccc", padding: "10px" }}>Роль</th>
            <th style={{ border: "1px solid #ccc", padding: "10px" }}>
              Статус
            </th>
            <th style={{ border: "1px solid #ccc", padding: "10px" }}>
              Действия
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                {u.id}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                {u.username}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                {u.role}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                {u.isBlocked ? "Заблокирован" : "Активен"}
              </td>
              <td
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  display: "flex",
                  gap: "10px",
                }}
              >
                <Link to={`/users/${u.id}/edit`}>
                  <button>Редактировать</button>
                </Link>
                {!u.isBlocked && (
                  <button
                    onClick={() => handleBlock(u.id)}
                    style={{
                      background: "#ff4d4f",
                      color: "white",
                      border: "none",
                      padding: "8px",
                    }}
                  >
                    Заблокировать
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
