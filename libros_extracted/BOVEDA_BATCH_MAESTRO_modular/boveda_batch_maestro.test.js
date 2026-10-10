"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const moduleDirectory = __dirname;
const context = vm.createContext({
  Logger: { log: () => {} }
});
const sourceFiles = [
  path.join(moduleDirectory, "..", "shared", "utils.gs"),
  ...fs.readdirSync(moduleDirectory)
    .filter(file => file.endsWith(".gs"))
    .sort()
    .map(file => path.join(moduleDirectory, file))
];

for (const file of sourceFiles) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

test("normaliza PIDs de Bóveda y conserva el formato JJD de campo", () => {
  assert.equal(context.limpiarYFormatearPid(" JJD014600012640962864 "), "JD014600012640962864");
  assert.equal(context.limpiarYFormatearPid("JD014600012640962864"), "JD014600012640962864");
  assert.equal(context.limpiarYFormatearPid("0146000126"), "JD0146000126");
  assert.equal(context.formatearPIDParaCampo("JD014600012640962864"), "JJD014600012640962864");
  assert.equal(context.formatearPIDParaCampo("JJD014600012640962864"), "JJD014600012640962864");
  assert.equal(context.limpiarYFormatearPid(""), "");
});

test("resuelve encabezados de Excel por alias y tolera puntuación", () => {
  const indexes = context.getColumnIndexesFromHeaders_(
    ["AWB No.", "piece_id", "Receiver Address 1", "C.P.", "AX"],
    ["hwb no", "piece id", "rcvr addr 1", "rcvr postcode", "formulas"]
  );

  assert.equal(indexes["hwb no"], 0);
  assert.equal(indexes["piece id"], 1);
  assert.equal(indexes["rcvr addr 1"], 2);
  assert.equal(indexes["rcvr postcode"], 3);
  assert.equal(indexes.formulas, 4);
});

test("rechaza encabezados duplicados que podrían desplazar la selección", () => {
  assert.throws(
    () => context.getColumnIndexesFromHeaders_(
      ["Piece ID", "PID"],
      ["piece id"]
    ),
    /Encabezado duplicado/
  );
});

test("la plantilla recibe las reglas UMA de 2026 centralizadas", () => {
  let templateName;
  const template = {
    evaluate: () => ({
      setTitle(title) {
        this.title = title;
        return this;
      },
      addMetaTag(name, content) {
        this.metaTag = [name, content];
        return this;
      }
    })
  };
  context.HtmlService = {
    createTemplateFromFile: name => {
      templateName = name;
      return template;
    }
  };

  const page = context.doGet({});

  assert.equal(templateName, "Index");
  assert.equal(template.valorUma2026, 108.57);
  assert.equal(template.topeReclamoUma2026, 30);
  assert.equal(page.title, "OLLIN - Control Remoto de Rampa");
});

test("el JavaScript de la UI compila al interpolar la configuración numérica", () => {
  const htmlPath = path.join(moduleDirectory, "Index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const scripts = Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
    .map(match => match[1].trim())
    .filter(Boolean);
  const renderedScripts = scripts.map(script => script
    .replace(/<\?!=\s*valorUma2026\s*\?>/g, "108.57")
    .replace(/<\?!=\s*topeReclamoUma2026\s*\?>/g, "30"));

  assert.ok(renderedScripts.some(script => script.includes("const VALOR_UMA = 108.57;")));
  for (const script of renderedScripts) {
    assert.doesNotThrow(() => new vm.Script(script));
  }
});

test("la consulta de columnas delega al helper compartido", () => {
  let requestedHeaders;
  const sharedGetter = context.getColumnIndexes;
  context.getColumnIndexes = (sheet, headers) => {
    requestedHeaders = headers;
    return sharedGetter(sheet, headers);
  };

  context.getColumnIndexesFromHeaders_(["Guía"], ["hwb no"]);

  assert.deepEqual(requestedHeaders, ["hwb no"]);
});
