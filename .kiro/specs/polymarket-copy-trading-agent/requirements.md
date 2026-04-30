# Documento de Requisitos — Polymarket Copy Trading Agent

## Introducción

Este documento define los requisitos para un agente de IA de copy trading que replica las operaciones de los 10 mejores traders en Polymarket. El agente se conecta a la wallet del usuario (MetaMask), calcula el tamaño proporcional de cada posición según el capital disponible, ejecuta operaciones automáticamente a través de la API CLOB de Polymarket, y presenta toda la información en tiempo real mediante una interfaz futurista con WebSockets. El sistema opera sobre la red Polygon (POS) utilizando USDC como stablecoin.

## Glosario

- **Agente**: El servicio backend de IA que monitorea traders, toma decisiones de trading y ejecuta operaciones en nombre del usuario.
- **CLOB_API**: La API de Central Limit Order Book de Polymarket utilizada para colocar y gestionar órdenes de trading.
- **Leaderboard_API**: La API de Polymarket que devuelve el ranking de traders por beneficio y volumen.
- **Top_Trader**: Un trader que se encuentra actualmente en las 10 primeras posiciones del leaderboard de Polymarket según beneficio acumulado.
- **Usuario**: La persona que utiliza la aplicación y cuya wallet se conecta para ejecutar operaciones.
- **Wallet**: La wallet MetaMask (EOA) del usuario conectada a la red Polygon.
- **Posición_Proporcional**: El tamaño de una operación calculado proporcionalmente al capital del usuario respecto al capital del Top_Trader que se está replicando.
- **Mercado**: Un mercado de predicción disponible en Polymarket donde se pueden comprar y vender tokens condicionales.
- **USDC**: La stablecoin USD Coin utilizada como moneda base para todas las operaciones en Polymarket sobre Polygon.
- **WebSocket_Server**: El servidor que transmite actualizaciones en tiempo real desde el Agente hacia la interfaz del Usuario.
- **Stop_Loss**: Un mecanismo de protección que cierra automáticamente una posición cuando la pérdida alcanza un umbral predefinido.
- **Panel**: La interfaz de usuario web con diseño futurista que muestra datos en tiempo real.
- **Token_Condicional**: Token ERC-1155 que representa una posición en un resultado específico de un Mercado en Polymarket.
- **Ratio_Capital**: La proporción entre el capital disponible del Usuario y el capital estimado del Top_Trader cuya operación se replica.

## Requisitos

### Requisito 1: Descubrimiento y Seguimiento de Top Traders

**Historia de Usuario:** Como usuario, quiero que el agente identifique y siga automáticamente a los 10 mejores traders de Polymarket, para poder replicar las estrategias de los más exitosos.

#### Criterios de Aceptación

1. WHEN el Agente se inicia, THE Agente SHALL consultar la Leaderboard_API de Polymarket y obtener la lista de los 10 traders con mayor beneficio acumulado.
2. WHILE el Agente está en ejecución, THE Agente SHALL actualizar la lista de Top_Traders cada 15 minutos consultando la Leaderboard_API.
3. WHEN un trader sale de las 10 primeras posiciones del leaderboard, THE Agente SHALL dejar de replicar nuevas operaciones de ese trader y registrar el cambio en el log de actividad.
4. WHEN un nuevo trader entra en las 10 primeras posiciones del leaderboard, THE Agente SHALL comenzar a monitorear las operaciones de ese nuevo Top_Trader y registrar el cambio en el log de actividad.
5. WHEN la Leaderboard_API no está disponible o devuelve un error, THE Agente SHALL mantener la última lista válida de Top_Traders y reintentar la consulta con un intervalo de retroceso exponencial hasta un máximo de 5 minutos.

### Requisito 2: Monitoreo de Operaciones de Top Traders

**Historia de Usuario:** Como usuario, quiero que el agente detecte en tiempo real las operaciones que realizan los top traders, para poder replicarlas lo antes posible.

#### Criterios de Aceptación

1. WHILE el Agente está en ejecución, THE Agente SHALL monitorear las operaciones de cada Top_Trader consultando la API de historial de trades de Polymarket con un intervalo máximo de 30 segundos.
2. WHEN un Top_Trader ejecuta una nueva operación de compra o venta en un Mercado, THE Agente SHALL detectar la operación y registrarla con la marca de tiempo, el mercado, la dirección (compra/venta), el precio y la cantidad.
3. WHEN el Agente detecta una operación duplicada ya procesada, THE Agente SHALL ignorar la operación duplicada sin ejecutar ninguna acción adicional.
4. IF la API de historial de trades devuelve un error para un Top_Trader específico, THEN THE Agente SHALL registrar el error y continuar monitoreando a los demás Top_Traders sin interrumpir el servicio.

### Requisito 3: Cálculo de Posición Proporcional

**Historia de Usuario:** Como usuario, quiero que el agente calcule automáticamente cuánto capital asignar a cada operación proporcionalmente a mi balance, para no arriesgar más de lo que puedo permitirme.

#### Criterios de Aceptación

1. WHEN el Agente detecta una operación de un Top_Trader, THE Agente SHALL calcular la Posición_Proporcional multiplicando el tamaño de la operación del Top_Trader por el Ratio_Capital del Usuario respecto a ese Top_Trader.
2. THE Agente SHALL obtener el balance actual de USDC de la Wallet del Usuario antes de calcular cada Posición_Proporcional.
3. WHEN la Posición_Proporcional calculada es inferior a 1 USDC, THE Agente SHALL descartar la operación y registrar el motivo en el log.
4. WHEN la Posición_Proporcional calculada supera el 10% del balance total de USDC del Usuario, THE Agente SHALL limitar la posición al 10% del balance total.
5. IF el balance de USDC del Usuario es inferior a 5 USDC, THEN THE Agente SHALL pausar la ejecución de nuevas operaciones y notificar al Usuario a través del Panel.
6. FOR ALL Posiciones_Proporcionales válidas, calcular la posición y luego recalcularla con los mismos parámetros de entrada SHALL producir un resultado idéntico (propiedad de determinismo).

### Requisito 4: Ejecución de Operaciones

**Historia de Usuario:** Como usuario, quiero que el agente ejecute automáticamente las operaciones en mi wallet, para no tener que hacerlo manualmente.

#### Criterios de Aceptación

1. WHEN el Agente decide ejecutar una operación, THE Agente SHALL enviar una orden a la CLOB_API de Polymarket con el tamaño de la Posición_Proporcional calculada, el mercado objetivo y la dirección (compra/venta).
2. WHEN la CLOB_API confirma la ejecución de una orden, THE Agente SHALL registrar la operación con el ID de la orden, la marca de tiempo, el precio de ejecución, la cantidad ejecutada y el Top_Trader de referencia.
3. IF la CLOB_API rechaza una orden, THEN THE Agente SHALL registrar el motivo del rechazo, notificar al Usuario a través del Panel y no reintentar la misma orden automáticamente.
4. WHEN el Agente ejecuta una operación de compra, THE Agente SHALL verificar que existen las aprobaciones de tokens necesarias (USDC y Token_Condicional) antes de enviar la orden.
5. IF las aprobaciones de tokens no están configuradas, THEN THE Agente SHALL solicitar al Usuario la aprobación a través del Panel antes de proceder con la operación.
6. WHEN un Top_Trader opera en un Mercado que no está disponible o no existe en Polymarket, THE Agente SHALL omitir la operación, registrar el motivo y continuar con las demás operaciones pendientes.

### Requisito 5: Gestión de Riesgos

**Historia de Usuario:** Como usuario, quiero que el agente gestione el riesgo de mis posiciones con límites y stop-loss, para proteger mi capital.

#### Criterios de Aceptación

1. THE Agente SHALL permitir al Usuario configurar un porcentaje máximo de capital total expuesto en posiciones abiertas, con un valor predeterminado del 50%.
2. WHEN el capital total expuesto en posiciones abiertas alcanza el límite configurado, THE Agente SHALL dejar de abrir nuevas posiciones y notificar al Usuario a través del Panel.
3. THE Agente SHALL permitir al Usuario configurar un porcentaje de Stop_Loss por posición individual, con un valor predeterminado del 15%.
4. WHILE una posición abierta tiene una pérdida no realizada que alcanza o supera el porcentaje de Stop_Loss configurado, THE Agente SHALL ejecutar una orden de venta para cerrar la posición y registrar la acción como cierre por Stop_Loss.
5. THE Agente SHALL permitir al Usuario configurar un límite máximo de operaciones por hora, con un valor predeterminado de 20 operaciones por hora.
6. WHEN el número de operaciones ejecutadas en la última hora alcanza el límite configurado, THE Agente SHALL pausar la ejecución de nuevas operaciones hasta que el contador horario lo permita y notificar al Usuario a través del Panel.
7. WHEN el Agente toma una decisión de gestión de riesgos (limitar posición, activar Stop_Loss, pausar operaciones), THE Agente SHALL registrar la decisión con el motivo, los parámetros involucrados y la marca de tiempo.

### Requisito 6: Conexión de Wallet

**Historia de Usuario:** Como usuario, quiero conectar mi wallet MetaMask a la aplicación, para que el agente pueda operar con mis fondos de forma segura.

#### Criterios de Aceptación

1. THE Panel SHALL proporcionar un botón de conexión de wallet que inicie el flujo de conexión con MetaMask.
2. WHEN el Usuario hace clic en el botón de conexión, THE Panel SHALL solicitar la conexión a MetaMask y obtener la dirección de la Wallet del Usuario en la red Polygon.
3. WHEN la Wallet se conecta exitosamente, THE Panel SHALL mostrar la dirección de la Wallet truncada y el balance de USDC del Usuario.
4. IF el Usuario rechaza la solicitud de conexión en MetaMask, THEN THE Panel SHALL mostrar un mensaje indicando que la conexión fue rechazada y permitir reintentar.
5. IF la Wallet del Usuario no está conectada a la red Polygon, THEN THE Panel SHALL solicitar al Usuario cambiar a la red Polygon a través de MetaMask.
6. WHEN la Wallet se desconecta, THE Agente SHALL pausar todas las operaciones de trading y THE Panel SHALL mostrar el estado desconectado.
7. THE Panel SHALL verificar el estado de conexión de la Wallet cada 30 segundos y actualizar la interfaz en consecuencia.

### Requisito 7: Interfaz de Usuario en Tiempo Real

**Historia de Usuario:** Como usuario, quiero ver en tiempo real toda la actividad del agente, las posiciones abiertas y el rendimiento, para tener control total sobre mis inversiones.

#### Criterios de Aceptación

1. THE Panel SHALL establecer una conexión WebSocket con el WebSocket_Server al cargarse la aplicación.
2. WHEN el WebSocket_Server recibe una actualización del Agente (nueva operación, cambio de Top_Traders, alerta de riesgo), THE WebSocket_Server SHALL transmitir la actualización al Panel en menos de 2 segundos.
3. THE Panel SHALL mostrar un dashboard principal con las siguientes secciones: lista de Top_Traders actuales, posiciones abiertas del Usuario, historial de operaciones recientes, balance de la Wallet y métricas de rendimiento.
4. WHEN el Agente ejecuta una nueva operación, THE Panel SHALL mostrar una notificación visual con los detalles de la operación (mercado, dirección, cantidad, Top_Trader de referencia).
5. THE Panel SHALL mostrar para cada Top_Trader: nombre o dirección, beneficio acumulado, número de operaciones replicadas y estado de seguimiento (activo/inactivo).
6. THE Panel SHALL mostrar para cada posición abierta: mercado, dirección, precio de entrada, precio actual, ganancia/pérdida no realizada en USDC y porcentaje, y nivel de Stop_Loss.
7. IF la conexión WebSocket se pierde, THEN THE Panel SHALL mostrar un indicador de desconexión y reintentar la conexión con un intervalo de retroceso exponencial hasta un máximo de 30 segundos.
8. THE Panel SHALL utilizar un diseño visual futurista con tema oscuro, animaciones fluidas y elementos de visualización de datos interactivos.

### Requisito 8: Decisiones Inteligentes del Agente de IA

**Historia de Usuario:** Como usuario, quiero que el agente tome decisiones inteligentes más allá de simplemente copiar operaciones, para optimizar mis resultados.

#### Criterios de Aceptación

1. WHEN el Agente detecta que múltiples Top_Traders ejecutan la misma operación en el mismo Mercado dentro de un período de 5 minutos, THE Agente SHALL aumentar la confianza de la señal y asignar hasta un 50% más de la Posición_Proporcional base (sin exceder los límites de riesgo).
2. WHEN el Agente detecta que un Top_Trader tiene una racha de 3 o más operaciones perdedoras consecutivas, THE Agente SHALL reducir la Posición_Proporcional para ese Top_Trader al 50% hasta que el trader registre una operación ganadora.
3. THE Agente SHALL asignar un peso de confianza a cada Top_Trader basado en su rendimiento reciente (últimos 30 días) y utilizar ese peso como factor multiplicador en el cálculo de la Posición_Proporcional.
4. WHEN el Agente detecta que el Mercado objetivo tiene un spread superior al 5% en el libro de órdenes, THE Agente SHALL posponer la operación hasta que el spread se reduzca por debajo del 5% o descartar la operación tras 10 minutos de espera.
5. THE Agente SHALL registrar cada decisión inteligente tomada con el razonamiento, los datos de entrada utilizados y el resultado de la decisión para auditoría del Usuario.

### Requisito 9: Persistencia de Datos

**Historia de Usuario:** Como usuario, quiero que el historial de operaciones, configuraciones y métricas se almacenen de forma persistente, para poder revisar el rendimiento histórico y no perder datos al reiniciar.

#### Criterios de Aceptación

1. THE Agente SHALL almacenar en base de datos cada operación ejecutada con: ID de orden, marca de tiempo, mercado, dirección, cantidad, precio, Top_Trader de referencia, resultado (éxito/fallo) y motivo de la decisión.
2. THE Agente SHALL almacenar el historial de cambios en la lista de Top_Traders con: marca de tiempo, trader que entró, trader que salió y posición en el ranking.
3. THE Agente SHALL almacenar las configuraciones del Usuario (límites de riesgo, porcentaje de Stop_Loss, límite de operaciones por hora) y restaurarlas al reiniciar el servicio.
4. THE Agente SHALL almacenar métricas de rendimiento diarias: beneficio/pérdida total, número de operaciones, tasa de acierto y capital expuesto promedio.
5. WHEN el Agente se reinicia, THE Agente SHALL cargar el último estado conocido de posiciones abiertas y configuraciones desde la base de datos y reanudar la operación.

### Requisito 10: Serialización y Deserialización de Datos de Trading

**Historia de Usuario:** Como usuario, quiero que los datos de operaciones y configuraciones se serialicen correctamente para comunicación entre servicios y almacenamiento, para garantizar la integridad de los datos.

#### Criterios de Aceptación

1. THE Agente SHALL serializar los datos de operaciones a formato JSON para transmisión a través del WebSocket_Server.
2. THE Agente SHALL deserializar las respuestas JSON de la CLOB_API y la Leaderboard_API en objetos tipados del dominio.
3. THE Agente SHALL serializar las configuraciones del Usuario a formato JSON para almacenamiento en base de datos.
4. FOR ALL objetos de operación válidos, serializar a JSON y luego deserializar desde JSON SHALL producir un objeto equivalente al original (propiedad de ida y vuelta).
5. FOR ALL objetos de configuración válidos, serializar a JSON y luego deserializar desde JSON SHALL producir un objeto equivalente al original (propiedad de ida y vuelta).
6. IF el Agente recibe un JSON malformado de la CLOB_API o la Leaderboard_API, THEN THE Agente SHALL registrar el error con el contenido recibido y continuar la operación sin interrumpir el servicio.
