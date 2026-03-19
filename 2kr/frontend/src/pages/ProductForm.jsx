import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function ProductForm() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    title: "", 
    category: "", 
    description: "", 
    price: "", 
    image: "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg" 
  });

  useEffect(() => {
    if (id) {
      apiClient.get(`/products/${id}`).then(({ data }) => setFormData(data));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) await apiClient.put(`/products/${id}`, formData);
      else await apiClient.post("/products", formData);
      navigate("/");
    } catch (error) {
      alert("Ошибка сохранения");
    }
  };

  return (
    <div>
      <h2>{id ? "Редактировать товар" : "Новый товар"}</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", width: "400px" }}>
        <input placeholder="Название" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ padding: "8px" }} />
        <input placeholder="Категория" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required style={{ padding: "8px" }} />
        <textarea placeholder="Описание" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required style={{ padding: "8px", height: "80px" }} />
        <input placeholder="Цена" type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required style={{ padding: "8px" }} />
        <input placeholder="URL картинки" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} required style={{ padding: "8px" }} />
        
        {formData.image && (
          <img src={formData.image} alt="Предпросмотр" style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "5px" }} />
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" style={{ flex: 1, padding: "10px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer" }}>Сохранить</button>
          <button type="button" onClick={() => navigate("/")} style={{ flex: 1, padding: "10px", cursor: "pointer" }}>Отмена</button>
        </div>
      </form>
    </div>
  );
}