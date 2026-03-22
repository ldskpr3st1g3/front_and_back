import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const { data } = await apiClient.get("/products");
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMe = async () => {
    try {
      const { data } = await apiClient.get("/auth/me");
      setMe(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;

    try {
      await apiClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка удаления");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    fetchMe();
    fetchProducts();
  }, []);

  const canCreateOrEdit = me?.role === "seller" || me?.role === "admin";
  const canDelete = me?.role === "admin";
  const canManageUsers = me?.role === "admin";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2>Магазин крокодилов 🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊</h2>
          {me && (
            <p>
              Вы вошли как: <b>{me.username}</b> | Роль: <b>{me.role}</b>
            </p>
          )}
        </div>
        <button onClick={handleLogout} style={{ padding: "8px 16px" }}>
          Выйти
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {canCreateOrEdit && (
          <Link to="/products/new">
            <button style={{ padding: "10px" }}>+ Создать товар</button>
          </Link>
        )}

        {canManageUsers && (
          <Link to="/users">
            <button style={{ padding: "10px" }}>
              Управление пользователями
            </button>
          </Link>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "15px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={p.image}
              alt={p.title}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            />
            <h3>{p.title}</h3>
            <p>{p.category}</p>
            <p style={{ flexGrow: 1 }}>{p.description}</p>
            <h3>{p.price} руб.</h3>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link to={`/products/${p.id}`}>
                <button>Подробнее</button>
              </Link>

              {canCreateOrEdit && (
                <Link to={`/products/${p.id}/edit`}>
                  <button>Изменить</button>
                </Link>
              )}

              {canDelete && (
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{
                    background: "#ff4d4f",
                    color: "white",
                    border: "none",
                    padding: "8px",
                  }}
                >
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
