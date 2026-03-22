import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/axios";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    apiClient
      .get(`/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => alert("Товар не найден"));
  }, [id]);

  if (!product) {
    return <p>Загрузка...</p>;
  }

  return (
    <div>
      <button onClick={() => navigate("/")} style={{ marginBottom: "20px" }}>
        Назад
      </button>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <img
          src={product.image}
          alt={product.title}
          style={{
            width: "350px",
            height: "350px",
            objectFit: "cover",
            borderRadius: "10px",
          }}
        />

        <div>
          <h2>{product.title}</h2>
          <p>
            <b>Категория:</b> {product.category}
          </p>
          <p>
            <b>Описание:</b> {product.description}
          </p>
          <p>
            <b>Цена:</b> {product.price} руб.
          </p>
          <p>
            <b>ID:</b> {product.id}
          </p>
        </div>
      </div>
    </div>
  );
}
