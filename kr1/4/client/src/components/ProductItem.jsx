import React from 'react';

export default function ProductItem({ product, onEdit, onDelete }) {
  // Дефолтная картинка-заглушка
  const defaultImage = 'https://via.placeholder.com/300x200?text=No+Image';
  const imageUrl = product.image || defaultImage;

  return (
    <div className="productRow">
      <div className="productImage">
        <img 
          src={imageUrl} 
          alt={product.name} 
          onError={(e) => {
            // Если картинка не загрузилась — ставим заглушку
            e.target.src = defaultImage;
          }}
        />
      </div>
      <div className="productMain">
        <div className="productId">#{product.id}</div>
        <div className="productName">{product.name}</div>
        <div className="productCategory">{product.category}</div>
        <div className="productPrice">{product.price} ₽</div>
        <div className="productStock">На складе: {product.stock}</div>
        <div className="productDescription">{product.description}</div>
      </div>
      <div className="productActions">
        <button className="btn" onClick={() => onEdit(product)}>
          ✏️ Редактировать
        </button>
        <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
          🗑️ Удалить
        </button>
      </div>
    </div>
  );
}