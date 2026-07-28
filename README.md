# TAT 360 — Evaluación de Desempeño

Aplicación web para gestionar la evaluación de desempeño 360° de un **Asesor
Comercial TAT** en empresas de consumo masivo y canal tradicional.

El sistema integra resultados comerciales, competencias observables, aspectos
actitudinales, valores corporativos y retroalimentación cualitativa en una
interfaz única con cálculo automático.

## Demostración

La versión alojada de la aplicación está disponible en:

<https://tat360-desempeno.just-pablx.chatgpt.site>

La instalación publicada es privada y puede solicitar autenticación.

## Funcionalidades

- Ficha de identificación del colaborador, ruta, zona y periodo.
- Registro de siete indicadores cuantitativos TAT.
- Conversión automática del cumplimiento de cada KPI a una nota de 1 a 5.
- Evaluación de comportamientos por cuatro fuentes:
  - Autoevaluación: 10%.
  - Jefe inmediato: 40%.
  - Pares o compañeros ruteros: 20%.
  - Clientes o tenderos: 30%.
- Redistribución proporcional cuando una fuente no tiene calificación.
- Cálculo automático de aportes por bloque y resultado final sobre 100.
- Conversión del resultado final a escala de 1 a 5.
- Control de completitud de los 21 criterios.
- Retroalimentación bajo el modelo:
  - Empezar a hacer.
  - Dejar de hacer.
  - Continuar haciendo.
- Registro de fortalezas, brechas y acciones de desarrollo.
- Generación de una vista imprimible.
- Diseño adaptable a computadores, tabletas y teléfonos.
- Guardado de evaluaciones en una base de datos central.
- Respaldo automático del borrador en el almacenamiento local del navegador.

## Ponderación de la evaluación

| Bloque | Peso |
|---|---:|
| Indicadores cuantitativos — KPIs | 30% |
| Competencias blandas y operativas | 30% |
| Aspectos longitudinales y actitudinales | 30% |
| Valores corporativos | 10% |

La calificación final se calcula mediante:

```text
Aporte del ítem = (calificación / 5) × peso global del ítem × 100
Resultado final = suma de los aportes de todos los ítems
Escala equivalente 1–5 = resultado final / 20
```

El resultado definitivo se habilita cuando están registrados los siete KPIs y
los catorce comportamientos cuentan con al menos una fuente válida.

## Requisitos

- [Node.js](https://nodejs.org/) versión `22.13.0` o superior.
- npm, incluido con Node.js.
- Git, necesario únicamente para clonar o contribuir al repositorio.

Compruebe las versiones instaladas:

```bash
node --version
npm --version
git --version
```

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/gitmidnight19/Evaluaci-n-de-Desempe-o-360.git
cd Evaluaci-n-de-Desempe-o-360
```

También puede descargar el repositorio como archivo ZIP desde GitHub y
descomprimirlo.

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Iniciar el entorno de desarrollo

```bash
npm run dev
```

Abra en el navegador la dirección mostrada por la terminal, normalmente:

```text
http://localhost:3000
```

Los comandos funcionan en **Windows, macOS y Linux** sin configuración
adicional.

## Construcción para producción

Genere la versión optimizada:

```bash
npm run build
```

Inicie localmente la versión construida:

```bash
npm run start
```

## Validaciones disponibles

Ejecute la prueba de renderizado:

```bash
npm test
```

Revise el código con ESLint:

```bash
npm run lint
```

## Uso de la aplicación

1. Abra **Ficha del evaluado** y registre la información del colaborador.
2. En **KPIs de resultados**, ingrese el resultado real y la meta de cada
   indicador.
3. En **Evaluación 360°**, registre las notas disponibles de autoevaluación,
   jefe, pares y clientes.
4. Consulte el **Tablero ejecutivo** para revisar completitud, aportes y
   calificación final.
5. Registre los comentarios en **Feedback y plan de desarrollo**.
6. Utilice **Imprimir informe** para generar una versión imprimible desde el
   navegador.

## Escala sugerida para los KPIs

| Cumplimiento frente a la meta | Nota |
|---|---:|
| Menos de 70% | 1 |
| 70% a menos de 85% | 2 |
| 85% a menos de 100% | 3 |
| 100% a menos de 110% | 4 |
| 110% o más | 5 |

## Persistencia de la información

El botón **Guardar evaluación** crea el registro en Cloudflare D1. Las
modificaciones posteriores actualizan el mismo registro, evitando duplicados.
La interfaz informa si la evaluación está guardada, tiene cambios pendientes o
si ocurrió un error.

Mientras se diligencia, también se conserva un borrador en `localStorage` para
proteger el trabajo ante cierres o fallos de conexión. El botón **Nueva
evaluación** inicia un registro diferente después de solicitar confirmación.

## Estructura principal

```text
app/
├── globals.css       Estilos visuales y comportamiento adaptable
├── layout.tsx        Metadatos y estructura general
└── page.tsx          Interfaz, datos, fórmulas y navegación

public/               Recursos públicos
tests/                Pruebas de renderizado
.openai/hosting.json  Configuración del alojamiento en OpenAI Sites
package.json          Dependencias y comandos del proyecto
```

## Tecnologías

- React 19.
- Next.js 16.
- TypeScript.
- Tailwind CSS 4.
- vinext y Vite para construcción y ejecución.
- Cloudflare Workers como destino de despliegue.

## Solución de problemas

### `npm install` presenta errores

Verifique que Node.js sea la versión 22.13.0 o una superior:

```bash
node --version
```

Elimine `node_modules`, conserve `package-lock.json` y vuelva a instalar:

```bash
npm install
```

### El puerto 3000 está ocupado

El servidor seleccionará otro puerto disponible y lo mostrará en la terminal.
Abra exactamente la dirección indicada.

### Los datos anteriores siguen apareciendo

Utilice **Nueva evaluación** dentro de la aplicación. También puede borrar los
datos del sitio desde la configuración del navegador.

### El resultado final aparece pendiente

Verifique que:

- Los siete KPIs tengan resultado y meta.
- Los catorce comportamientos tengan al menos una fuente calificada.
- Las metas sean mayores que cero.

## Privacidad

La evaluación de desempeño contiene información laboral confidencial. Antes de
usar este proyecto en producción, la organización debe definir controles de
acceso, retención de información, respaldos y tratamiento de datos personales
de acuerdo con sus políticas y la legislación aplicable.

## Estado del proyecto

Versión inicial funcional. La aplicación no requiere variables de entorno,
base de datos ni servicios externos para ejecutarse localmente.
