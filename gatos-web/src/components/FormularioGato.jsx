import { useEffect, useRef, useState } from "react";
import { registrarGato } from "../services/gatoService";
import "./FormularioGato.css";

const MAX_BYTES = 5 * 1024 * 1024; // mismo límite (5 MB) que el backend

export default function FormularioGato() {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [raza, setRaza] = useState("");
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: "ok" | "error", texto, imagenUrl }
  const inputImagen = useRef(null);

  // Libera la URL temporal de la vista previa cuando cambia o se desmonta
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const seleccionarImagen = (e) => {
    const archivo = e.target.files[0];

    if (!archivo) {
      setImagen(null);
      setPreview(null);
      return;
    }

    if (!archivo.type.startsWith("image/")) {
      setAviso({ tipo: "error", texto: "El archivo debe ser una imagen." });
      e.target.value = "";
      return;
    }

    if (archivo.size > MAX_BYTES) {
      setAviso({ tipo: "error", texto: "La imagen no puede superar los 5 MB." });
      e.target.value = "";
      return;
    }

    setAviso(null);
    setImagen(archivo);
    setPreview(URL.createObjectURL(archivo));
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();

    if (!nombre.trim() || !edad || !peso || !raza.trim() || !imagen) {
      setAviso({
        tipo: "error",
        texto: "Completa todos los campos y selecciona una imagen.",
      });
      return;
    }

    setEnviando(true);
    setAviso(null);

    try {
      const data = await registrarGato({
        nombre: nombre.trim(),
        edad,
        peso,
        raza: raza.trim(),
        imagen,
      });

      setAviso({
        tipo: "ok",
        texto: data.mensaje || "Gato registrado correctamente.",
        imagenUrl: data.imagenUrl,
      });

      setNombre("");
      setEdad("");
      setPeso("");
      setRaza("");
      setImagen(null);
      setPreview(null);
      if (inputImagen.current) inputImagen.current.value = "";
    } catch (error) {
      console.error(error);
      setAviso({
        tipo: "error",
        texto: error.message || "No se pudo conectar con el servidor.",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container">
      <form className="card" onSubmit={enviarFormulario}>
        <h1 className="titulo">Registro de Gato</h1>

        <label className="label" htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          className="input"
          type="text"
          placeholder="Ej: Michi"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label className="label" htmlFor="edad">Edad (años)</label>
        <input
          id="edad"
          className="input"
          type="number"
          min="0"
          step="0.1"
          placeholder="Ej: 2.5"
          value={edad}
          onChange={(e) => setEdad(e.target.value)}
        />

        <label className="label" htmlFor="peso">Peso (kg)</label>
        <input
          id="peso"
          className="input"
          type="number"
          min="0"
          step="0.1"
          placeholder="Ej: 4.2"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
        />

        <label className="label" htmlFor="raza">Raza</label>
        <input
          id="raza"
          className="input"
          type="text"
          placeholder="Ej: Siames"
          value={raza}
          onChange={(e) => setRaza(e.target.value)}
        />

        <label className="label" htmlFor="imagen">Imagen del gato</label>
        <input
          id="imagen"
          ref={inputImagen}
          className="input-archivo"
          type="file"
          accept="image/*"
          onChange={seleccionarImagen}
        />

        {preview && <img className="preview" src={preview} alt="Vista previa" />}

        <button className="boton-enviar" type="submit" disabled={enviando}>
          {enviando ? "Registrando..." : "Registrar Gato"}
        </button>

        {aviso && (
          <div className={`aviso aviso-${aviso.tipo}`} role="alert">
            <p>{aviso.texto}</p>
            {aviso.imagenUrl && (
              <img className="preview" src={aviso.imagenUrl} alt="Gato registrado" />
            )}
          </div>
        )}
      </form>
    </div>
  );
}
