import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function Products() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const { data } = await apiClient.get("/products");
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Удалить товар?")) {
      try {
        await apiClient.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        alert("Ошибка удаления");
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => { fetchProducts(); }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Магазин крокодилов 🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊🐊</h2>
        <button onClick={handleLogout} style={{ padding: "8px 16px", cursor: "pointer" }}>Выйти</button>
      </div>
      
      <Link to="/products/new">
        <button style={{ marginBottom: "20px", padding: "10px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
          + Создать товар
        </button>
      </Link>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
        {products.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <img src={p.image} alt={p.title} style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px", marginBottom: "15px" }} />
            <h3 style={{ margin: "0 0 10px 0" }}>{p.title}</h3>
            <p style={{ margin: "0 0 5px 0", color: "#666" }}>{p.category}</p>
            <p style={{ margin: "0 0 15px 0", fontSize: "14px", flexGrow: 1 }}>{p.description}</p>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>{p.price} руб.</h3>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <Link to={`/products/${p.id}/edit`} style={{ flex: 1 }}>
                <button style={{ width: "100%", padding: "8px", cursor: "pointer" }}>Изменить</button>
              </Link>
              <button onClick={() => handleDelete(p.id)} style={{ flex: 1, padding: "8px", background: "#ff4d4f", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}