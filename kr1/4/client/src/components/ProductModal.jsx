import React, { useEffect, useState } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  // === Состояния формы ===
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(''); 

  // === Сброс формы при открытии ===
  useEffect(() => {
    if (!open) return;
    setName(initialProduct?.name ?? '');
    setCategory(initialProduct?.category ?? '');
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : '');
    setStock(initialProduct?.stock != null ? String(initialProduct.stock) : '');
    setDescription(initialProduct?.description ?? '');
    setImage(initialProduct?.image ?? ''); 
  }, [open, initialProduct]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Редактирование товара' : 'Создание товара';

  // === Обработка отправки формы ===
  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!trimmedName) {
      alert('Введите название товара');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      alert('Введите корректную цену');
      return;
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      alert('Введите корректное количество');
      return;
    }

    onSubmit({
      id: initialProduct?.id,
      name: trimmedName,
      category: category.trim(),
      price: parsedPrice,
      stock: parsedStock,
      description: description.trim(),
      image: image.trim() 
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Ноутбук"
              autoFocus
              required
            />
          </label>

          <label className="label">
            Категория
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Например, Электроника"
            />
          </label>

          <label className="label">
            Цена (₽)
            <input
              className="input"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Например, 50000"
              min="0"
              required
            />
          </label>

          <label className="label">
            Количество на складе
            <input
              className="input"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Например, 10"
              min="0"
            />
          </label>

          <label className="label">
            Описание
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание товара"
              rows="3"
            />
          </label>

          {/* ← Поле для URL изображения */}
          <label className="label">
            URL изображения
            <input
              className="input"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </label>

          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === 'edit' ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}