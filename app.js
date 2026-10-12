
let experiencias    = [];
let reservas        = [];
let textoBusqueda   = "";
let categoriaActual = "todas";
let ordenActual     = "normal";
let precioMaxActual = Infinity;

const catalogo          = document.querySelector("#catalogo");
const buscador          = document.querySelector("#buscador");
const filtroCategoria   = document.querySelector("#filtroCategoria");
const ordenPrecio       = document.querySelector("#ordenPrecio");
const precioMaxInput    = document.querySelector("#precioMax");
const listaReservas     = document.querySelector("#listaReservas");
const total             = document.querySelector("#total");
const totalPersonas     = document.querySelector("#totalPersonas");
const estado            = document.querySelector("#estado");
const sinResultados     = document.querySelector("#sinResultados");
const btnVaciar         = document.querySelector("#btnVaciar");
const mensajeValidacion = document.querySelector("#mensajeValidacion");

async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./experiencias-rivera/data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    estado.textContent = `${experiencias.length} experiencias disponibles`;
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}

function obtenerResultados() {
  let resultados = [...experiencias];
  if (categoriaActual !== "todas")
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  if (textoBusqueda !== "")
    resultados = resultados.filter(e => e.nombre.toLowerCase().includes(textoBusqueda));
  if (precioMaxActual !== Infinity && !isNaN(precioMaxActual))
    resultados = resultados.filter(e => e.precio <= precioMaxActual);
  if (ordenActual === "ascendente")  resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);
  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();
  if (resultados.length === 0) {
    catalogo.innerHTML = "";
    sinResultados.classList.remove("oculto");
    estado.textContent = "0 resultados";
    return;
  }
  sinResultados.classList.add("oculto");
  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono || ''}</div>
      <div class="informacion">
        <span class="etiqueta">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>
  `).join("");
  estado.textContent = `${resultados.length} resultado${resultados.length !== 1 ? "s" : ""}`;
  agregarEventosReservar();
}

function inicializarBotonesFiltro() {
  document.querySelectorAll("[data-categoria]").forEach(boton => {
    boton.addEventListener("click", () => {
      document.querySelectorAll("[data-categoria]").forEach(b => b.classList.remove("activo"));
      boton.classList.add("activo");
      categoriaActual = boton.dataset.categoria;
      if (filtroCategoria) filtroCategoria.value = categoriaActual;
      actualizarCatalogo();
    });
  });
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
  });
}

function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const inputCantidad = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(inputCantidad.value);

  if (cantidad < 1 || !Number.isInteger(cantidad)) {
    mostrarMensaje("La cantidad debe ser al menos 1.", "error"); return;
  }
  if (cantidad > experiencia.cupo) {
    mostrarMensaje(`La cantidad supera el cupo disponible (${experiencia.cupo}).`, "error"); return;
  }
  
  const existente = reservas.find(r => r.experienciaId === id);
  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje(`Con esa cantidad superarías el cupo (${experiencia.cupo}).`, "error"); return;
    }
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({ 
      experienciaId: id, 
      nombre: experiencia.nombre,
      precio: experiencia.precio, 
      cantidad, 
      subtotal: experiencia.precio * cantidad 
    });
  }
  
  mostrarMensaje(`"${experiencia.nombre}" agregada correctamente.`, "exito");
  mostrarReservas();
}

function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent         = "$0 MXN";
    totalPersonas.textContent = "0";
    btnVaciar.classList.add("oculto");
    return;
  }
  btnVaciar.classList.remove("oculto");
  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × $${r.precio}</p>
      </div>
      <div class="item-reserva__acciones">
        <strong>$${r.subtotal} MXN</strong>
        <div class="cantidad-controles">
          <button class="btn-disminuir" data-id="${r.experienciaId}">−</button>
          <span class="cantidad-valor">${r.cantidad}</span>
          <button class="btn-aumentar" data-id="${r.experienciaId}">+</button>
        </div>
        <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
      </div>
    </article>
  `).join("");
  totalPersonas.textContent = reservas.reduce((s, r) => s + r.cantidad, 0);
  total.textContent         = `$${reservas.reduce((s, r) => s + r.subtotal, 0)} MXN`;
  agregarEventosEliminar();
  agregarEventosCantidad();
}

function agregarEventosCantidad() {
  document.querySelectorAll(".btn-disminuir").forEach(b =>
    b.addEventListener("click", () => ajustarCantidad(Number(b.dataset.id), -1)));
  document.querySelectorAll(".btn-aumentar").forEach(b =>
    b.addEventListener("click", () => ajustarCantidad(Number(b.dataset.id), +1)));
}

function ajustarCantidad(id, delta) {
  const reserva     = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);
  const nueva       = reserva.cantidad + delta;
  if (nueva < 1) { eliminarReserva(id); return; }
  if (nueva > experiencia.cupo) {
    mostrarMensaje(`No hay más cupo para "${experiencia.nombre}".`, "error"); return;
  }
  reserva.cantidad = nueva;
  reserva.subtotal = nueva * reserva.precio;
  mostrarReservas();
}

function agregarEventosEliminar() {
  document.querySelectorAll(".btn-eliminar").forEach(boton => {
    boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id)));
  });
}

function eliminarReserva(id) {
  const nombre = reservas.find(r => r.experienciaId === id)?.nombre ?? "";
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarMensaje(`"${nombre}" eliminada de la reservación.`, "info");
  mostrarReservas();
}

function vaciarReservacion() {
  const dialogoExistente = document.querySelector("#dialogoConfirmacion");
  if (dialogoExistente) dialogoExistente.remove();
  const dialogo = document.createElement("div");
  dialogo.id        = "dialogoConfirmacion";
  dialogo.className = "dialogo-confirmacion";
  dialogo.innerHTML = `
    <p>¿Vaciar toda la reservación?</p>
    <p>Esta acción eliminará todas las experiencias seleccionadas.</p>
    <div class="dialogo-botones">
      <button id="btnConfirmarVaciar" class="btn-peligro">Sí, vaciar</button>
      <button id="btnCancelarVaciar">Cancelar</button>
    </div>
  `;
  document.querySelector(".resumen").appendChild(dialogo);
  document.querySelector("#btnConfirmarVaciar").addEventListener("click", () => {
    reservas = [];
    mostrarReservas();
    mostrarMensaje("Reservación vaciada.", "info");
    dialogo.remove();
  });
  document.querySelector("#btnCancelarVaciar").addEventListener("click", () => dialogo.remove());
}

let timerMensaje = null;
function mostrarMensaje(texto, tipo = "info") {
  mensajeValidacion.textContent = texto;
  mensajeValidacion.className   = `mensaje-validacion mensaje-${tipo}`;
  mensajeValidacion.classList.remove("oculto");
  clearTimeout(timerMensaje);
  timerMensaje = setTimeout(() => mensajeValidacion.classList.add("oculto"), 3500);
}


buscador?.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});
filtroCategoria?.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  document.querySelectorAll("[data-categoria]").forEach(b =>
    b.classList.toggle("activo", b.dataset.categoria === categoriaActual));
  actualizarCatalogo();
});
ordenPrecio?.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});
precioMaxInput?.addEventListener("input", () => {
  const val = precioMaxInput.value.trim();
  precioMaxActual = val === "" ? Infinity : Number(val);
  actualizarCatalogo();
});
btnVaciar?.addEventListener("click", vaciarReservacion);

inicializarBotonesFiltro();
cargarExperiencias();