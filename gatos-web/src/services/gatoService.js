// URL del backend desplegado en Render (termina en /gato)
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://guia-de-trabajo-3-9t2e.onrender.com/gato";

export const registrarGato = async (datos) => {
  const formData = new FormData();

  formData.append("nombre", datos.nombre);
  formData.append("edad", datos.edad);
  formData.append("peso", datos.peso);
  formData.append("raza", datos.raza);
  // En web, "imagen" es el objeto File que da el input type="file"
  formData.append("imagen", datos.imagen);

  const respuesta = await fetch(BACKEND_URL, {
    method: "POST",
    body: formData,
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.mensaje || "Error al registrar el gato");
  }

  return data;
};
