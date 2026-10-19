import ExcelJS from "exceljs";
import { calcularEstadisticas } from "./estadisticas.controller.js";

export const exportarEstadisticasExcel = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen
    const hojaResumen = workbook.addWorksheet("Resumen");
    hojaResumen.addRow(["Métrica", "Valor"]);
    hojaResumen.addRow(["Total de gatos", stats.total]);
    hojaResumen.addRow(["Promedio de edad (años)", stats.promedioEdad]);
    hojaResumen.addRow(["Promedio de peso (kg)", stats.promedioPeso]);
    hojaResumen.addRow(["Edad mínima", stats.edadMin ?? "—"]);
    hojaResumen.addRow(["Edad máxima", stats.edadMax ?? "—"]);
    hojaResumen.addRow(["Peso mínimo (kg)", stats.pesoMin ?? "—"]);
    hojaResumen.addRow(["Peso máximo (kg)", stats.pesoMax ?? "—"]);
    hojaResumen.addRow(["Fecha de generación", new Date().toLocaleString("es-ES")]);

    // Hoja 2: Por raza
    const hojaRazas = workbook.addWorksheet("Por Raza");
    hojaRazas.addRow(["Raza", "Cantidad", "Porcentaje (%)"]);
    Object.entries(stats.porRaza).forEach(([raza, cantidad]) => {
      hojaRazas.addRow([raza, cantidad, Number(((cantidad / stats.total) * 100).toFixed(1))]);
    });

    // Hoja 3: Por mes
    const hojaMeses = workbook.addWorksheet("Por Mes");
    hojaMeses.addRow(["Mes (YYYY-MM)", "Cantidad"]);
    Object.entries(stats.porMes).forEach(([mes, cantidad]) => {
      hojaMeses.addRow([mes, cantidad]);
    });

    // Hoja 4: Listado de gatos
    const hojaGatos = workbook.addWorksheet("Listado de Gatos");
    hojaGatos.addRow(["ID", "Nombre", "Edad", "Peso (kg)", "Raza", "Fecha de registro"]);
    stats.gatos.forEach((g) => {
      hojaGatos.addRow([
        g.id,
        g.nombre,
        g.edad,
        g.peso,
        g.raza,
        g.fecha ? new Date(g.fecha).toLocaleString("es-ES") : "—",
      ]);
    });

    // Enviar el archivo
    const nombreArchivo = `estadisticas-gatos-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al generar Excel:", error);
    res.status(500).json({
      mensaje: "Error al generar el archivo Excel.",
      error: error.message,
    });
  }
};
