import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/axios";

const DEFAULT_IMAGE =
  "https://www.kukumyava.ru/upload/resize_cache/iblock/231/yjqfkea54zk9rbry46owefncod4fiy8s/1200_1200_140cd750bba9870f18aada2478b24840a/15523-02.jpg";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    price: "",
    image: DEFAULT_IMAGE,
  });

  useEffect(() => {
    if (id) {
      apiClient
        .get(`/products/${id}`)
        .then(({ data }) => setFormData(data))
        .catch(() => alert("Не удалось загрузить товар"));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (id) {
        await apiClient.put(`/products/${id}`, formData);
      } else {
        await apiClient.post("/products", formData);
      }
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.error || "Ошибка сохранения");
    }
  };

  return (
    <div>
      <h2>{id ? "Редактировать товар" : "Создать товар"}</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          width: "400px",
        }}
      >
        <input
          placeholder="Название"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          style={{ padding: "8px" }}
        />
        <input
          placeholder="Категория"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          required
          style={{ padding: "8px" }}
        />
        <textarea
          placeholder="Описание"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
          style={{ padding: "8px", height: "100px" }}
        />
        <input
          placeholder="Цена"
          type="number"
          value={formData.price}
          onChange={(e) =>
            setFormData({ ...formData, price: Number(e.target.value) })
          }
          required
          style={{ padding: "8px" }}
        />
        <input
          placeholder="Ссылка на изображение"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          required
          style={{ padding: "8px" }}
        />

        {formData.image && (
          <img
            src={formData.image}
            alt="Предпросмотр"
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" style={{ padding: "10px", flex: 1 }}>
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{ padding: "10px", flex: 1 }}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
