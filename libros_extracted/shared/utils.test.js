"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const helperPath = path.join(__dirname, "utils.gs");
const helperSource = fs.readFileSync(helperPath, "utf8");
const helperContext = vm.createContext({});
vm.runInContext(helperSource, helperContext, { filename: helperPath });

const sanitizarPIDParaBoveda = helperContext.sanitizarPIDParaBoveda;

test("convierte el prefijo JJD a JD y conserva el resto del PID", () => {
  assert.equal(
    sanitizarPIDParaBoveda("JJD01460012345678"),
    "JD01460012345678"
  );
});

test("normaliza espacios y minúsculas antes de convertir", () => {
  assert.equal(
    sanitizarPIDParaBoveda("  jjd01460012345678  "),
    "JD01460012345678"
  );
});

test("conserva un PID que ya usa el prefijo JD", () => {
  assert.equal(sanitizarPIDParaBoveda("JD01460012345678"), "JD01460012345678");
});

test("no reemplaza JJD si no aparece al inicio del PID", () => {
  assert.equal(sanitizarPIDParaBoveda("XJJD01460012345678"), "XJJD01460012345678");
});

test("devuelve texto vacío para cadenas vacías o compuestas por espacios", () => {
  assert.equal(sanitizarPIDParaBoveda(""), "");
  assert.equal(sanitizarPIDParaBoveda("   "), "");
});

test("convierte valores escalares a texto antes de normalizarlos", () => {
  assert.equal(sanitizarPIDParaBoveda(12345), "12345");
});

test("rechaza valores null y undefined", () => {
  assert.throws(() => sanitizarPIDParaBoveda(null), /El PID es requerido/);
  assert.throws(() => sanitizarPIDParaBoveda(undefined), /El PID es requerido/);
});
