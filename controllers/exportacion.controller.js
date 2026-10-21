import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import db from "../firebase.js";
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

export const exportarEstadisticasPDF = async (req, res) => {
  try {
    const stats = await calcularEstadisticas();

    // Crear el documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true, // necesario para poder volver a cada página y poner el pie
      info: {
        Title: "Estadísticas de Gatos",
        Author: "Sistema de Gatos",
      },
    });

    // Configurar headers para la descarga
    const nombreArchivo = `estadisticas-gatos-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    // Pipe el PDF directamente a la respuesta
    doc.pipe(res);

    // ========== ESTILOS Y COLORES ==========
    const colorPrincipal = "#4472C4";
    const colorSecundario = "#5B9BD5";
    const colorTexto = "#333333";

    // ========== TÍTULO ==========
    doc
      .fontSize(22)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Estadísticas de Gatos", { align: "center" });

    doc.moveDown(0.3);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica")
      .text(`Generado el: ${new Date().toLocaleString("es-ES")}`, {
        align: "center",
      });

    doc.moveDown(1.5);

    // ========== RESUMEN GENERAL ==========
    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Resumen General");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    const resumen = [
      ["Total de gatos", stats.total],
      ["Promedio de edad", `${stats.promedioEdad} años`],
      ["Promedio de peso", `${stats.promedioPeso} kg`],
      ["Edad mínima", stats.edadMin !== null ? `${stats.edadMin} años` : "—"],
      ["Edad máxima", stats.edadMax !== null ? `${stats.edadMax} años` : "—"],
      ["Peso mínimo", stats.pesoMin !== null ? `${stats.pesoMin} kg` : "—"],
      ["Peso máximo", stats.pesoMax !== null ? `${stats.pesoMax} kg` : "—"],
    ];

    resumen.forEach(([label, valor]) => {
      doc
        .fontSize(11)
        .fillColor(colorTexto)
        .font("Helvetica-Bold")
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .text(String(valor));
      doc.moveDown(0.3);
    });

    doc.moveDown(1);

    // ========== DISTRIBUCIÓN POR RAZA ==========
    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Distribución por Raza");

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    if (Object.keys(stats.porRaza).length === 0) {
      doc.fontSize(11).fillColor("#666").text("No hay datos de razas.");
    } else {
      // Encabezado de tabla
      const startY = doc.y;
      doc
        .fontSize(10)
        .fillColor("#FFFFFF")
        .rect(50, startY, 495, 22)
        .fill(colorSecundario);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text("Raza", 60, startY + 6)
        .text("Cantidad", 300, startY + 6)
        .text("Porcentaje", 420, startY + 6);

      doc.y = startY + 28;

      // Filas
      const razasOrdenadas = Object.entries(stats.porRaza).sort(
        (a, b) => b[1] - a[1]
      );

      razasOrdenadas.forEach(([raza, cantidad], index) => {
        const porcentaje =
          stats.total > 0
            ? ((cantidad / stats.total) * 100).toFixed(1)
            : "0.0";

        // Fondo alternado
        if (index % 2 === 0) {
          doc.rect(50, doc.y - 4, 495, 20).fill("#F2F2F2");
        }

        // Guardamos la altura para que las 3 columnas queden en la misma línea
        const filaY = doc.y;
        doc
          .fillColor(colorTexto)
          .font("Helvetica")
          .fontSize(10)
          .text(raza, 60, filaY)
          .text(String(cantidad), 300, filaY)
          .text(`${porcentaje}%`, 420, filaY);

        doc.moveDown(0.7);
      });
    }

    doc.moveDown(1.2);

    // ========== REGISTROS POR MES ==========
    doc
      .fontSize(14)
      .fillColor(colorPrincipal)
      .font("Helvetica-Bold")
      .text("Gatos registrados por mes", 50); // volvemos al margen izquierdo

    doc
      .moveTo(50, doc.y + 5)
      .lineTo(545, doc.y + 5)
      .strokeColor(colorPrincipal)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    if (Object.keys(stats.porMes).length === 0) {
      doc.fontSize(11).fillColor("#666").text("No hay datos por mes.");
    } else {
      const mesesOrdenados = Object.entries(stats.porMes).sort((a, b) =>
        a[0].localeCompare(b[0])
      );

      mesesOrdenados.forEach(([mes, cantidad]) => {
        doc
          .fontSize(11)
          .fillColor(colorTexto)
          .font("Helvetica-Bold")
          .text(`${mes}: `, { continued: true })
          .font("Helvetica")
          .text(`${cantidad} gato(s)`);
        doc.moveDown(0.3);
      });
    }

    // ========== PIE DE PÁGINA ==========
    const rangoPaginas = doc.bufferedPageRange();
    for (let i = 0; i < rangoPaginas.count; i++) {
      doc.switchToPage(i);

      // Sin margen inferior, para que el pie no genere una página nueva
      const margenInferior = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc
        .fontSize(8)
        .fillColor("#999999")
        .text(
          `Página ${i + 1} de ${rangoPaginas.count}  |  Sistema de Gatos`,
          50,
          doc.page.height - 40,
          { align: "center", width: 495 }
        );

      doc.page.margins.bottom = margenInferior;
    }

    // Finalizar el documento
    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    // Si ya se enviaron headers, no se puede enviar JSON
    if (!res.headersSent) {
      res.status(500).json({
        mensaje: "Error al generar el archivo PDF.",
        error: error.message,
      });
    }
  }
};

export const exportarGatosCSV = async (req, res) => {
  try {
    const snapshot = await db.collection("gatos").orderBy("fecha", "desc").get();

    const gatos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Función para escapar correctamente valores CSV
    const escapar = (valor) => {
      if (valor === null || valor === undefined) return "";
      const str = String(valor);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Encabezados del CSV
    const encabezados = ["ID", "Nombre", "Edad", "Peso (kg)", "Raza", "URL Imagen", "Fecha de registro"];

    const lineas = [encabezados.join(",")];

    // Filas de datos
    gatos.forEach((gato) => {
      const fecha = gato.fecha
        ? new Date(gato.fecha).toLocaleString("es-ES")
        : "";

      const fila = [
        escapar(gato.id),
        escapar(gato.nombre),
        gato.edad ?? "",
        gato.peso ?? "",
        escapar(gato.raza),
        escapar(gato.imagenUrl),
        escapar(fecha),
      ];

      lineas.push(fila.join(","));
    });

    const csvContent = lineas.join("\n");

    const nombreArchivo = `gatos-${new Date().toISOString().slice(0, 10)}.csv`;

    // Headers para forzar la descarga
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`
    );

    // BOM UTF-8 para que Excel muestre bien los acentos
    res.write("﻿");
    res.end(csvContent);
  } catch (error) {
    console.error("Error al exportar gatos a CSV:", error);
    res.status(500).json({
      mensaje: "Error al generar el archivo CSV de gatos.",
      error: error.message,
    });
  }
};
