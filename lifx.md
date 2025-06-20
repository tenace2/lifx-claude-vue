# LIFX API Detailed Reference

This document provides comprehensive details about all LIFX API endpoints including paths, HTTP methods, parameters, and requirements.

## Base Information

- **Base URL**: `https://api.lifx.com/v1/`
- **Authentication**: Bearer token in Authorization header
- **Content-Type**: `application/json` (for POST/PUT requests with body)

## API Endpoints

### 1. List Lights

- **Endpoint**: `GET /lights/{selector}`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}`
- **Description**: Gets lights belonging to the authenticated account
- **Path Parameters**:
  - `selector` (string, required) - Light selector (e.g., "all", "id:d3b2f2d97452", "label:Kitchen")
- **Query Parameters**: None
- **Body Parameters**: None
- **Example**: `GET /lights/all`

### 2. Set State

- **Endpoint**: `PUT /lights/{selector}/state`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/state`
- **Description**: Sets the state of lights within the selector
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Query Parameters**: None
- **Body Parameters** (all optional):
  - `power` (string) - "on" or "off"
  - `color` (string) - Color specification (e.g., "blue", "rgb:255,0,0", "hue:120 saturation:1.0")
  - `brightness` (number) - 0.0 to 1.0
  - `duration` (number) - Transition time in seconds
  - `infrared` (number) - Infrared brightness 0.0 to 1.0
  - `fast` (boolean) - Skip state checks for faster execution
- **Example**: `PUT /lights/all/state` with body `{"power": "on", "color": "blue", "brightness": 0.5}`

### 3. Set States

- **Endpoint**: `PUT /lights/states`
- **Full Path**: `https://api.lifx.com/v1/lights/states`
- **Description**: Sets the state of multiple lights with different configurations
- **Path Parameters**: None
- **Query Parameters**: None
- **Body Parameters**:
  - `states` (array, required) - Array of state objects, each containing:
    - `selector` (string, required) - Light selector
    - `power` (string, optional) - "on" or "off"
    - `color` (string, optional) - Color specification
    - `brightness` (number, optional) - 0.0 to 1.0
    - `duration` (number, optional) - Transition time in seconds
    - `infrared` (number, optional) - Infrared brightness 0.0 to 1.0
  - `defaults` (object, optional) - Default values for all states
- **Example**: `PUT /lights/states`

### 4. State Delta

- **Endpoint**: `POST /lights/{selector}/state/delta`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/state/delta`
- **Description**: Apply relative changes to light state
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `power` (string, optional) - "on" or "off"
  - `duration` (number, optional) - Transition time in seconds
  - `infrared` (number, optional) - Infrared brightness delta (-1.0 to 1.0)
  - `hue` (number, optional) - Hue delta in degrees
  - `saturation` (number, optional) - Saturation delta (-1.0 to 1.0)
  - `brightness` (number, optional) - Brightness delta (-1.0 to 1.0)
  - `kelvin` (number, optional) - Kelvin delta

### 5. Toggle Power

- **Endpoint**: `POST /lights/{selector}/toggle`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/toggle`
- **Description**: Toggle power state of lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `duration` (number, optional) - Transition time in seconds

### 6. Breathe Effect

- **Endpoint**: `POST /lights/{selector}/effects/breathe`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/breathe`
- **Description**: Performs a breathe effect by fading between colors
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `color` (string, required) - Color to breathe to
  - `from_color` (string, optional) - Color to breathe from (current color if not specified)
  - `period` (number, optional) - Time in seconds for one cycle (default: 1.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `persist` (boolean, optional) - Whether to keep the effect running (default: false)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)
  - `peak` (number, optional) - Peak brightness ratio (0.0 to 1.0, default: 1.0)

### 7. Move Effect

- **Endpoint**: `POST /lights/{selector}/effects/move`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/move`
- **Description**: Creates a moving effect for multizone lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `direction` (string, required) - "forward" or "backward"
  - `period` (number, optional) - Time in seconds for movement (default: 1.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 8. Morph Effect

- **Endpoint**: `POST /lights/{selector}/effects/morph`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/morph`
- **Description**: Applies a morph effect to tile lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `palette` (array, required) - Array of color strings
  - `period` (number, optional) - Time in seconds for one cycle (default: 5.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 9. Flame Effect

- **Endpoint**: `POST /lights/{selector}/effects/flame`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/flame`
- **Description**: Applies a flame effect to lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `period` (number, optional) - Time in seconds for effect (default: 5.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 10. Pulse Effect

- **Endpoint**: `POST /lights/{selector}/effects/pulse`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/pulse`
- **Description**: Performs a pulse effect
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `color` (string, required) - Color to pulse to
  - `from_color` (string, optional) - Color to pulse from
  - `period` (number, optional) - Time in seconds for one pulse (default: 1.0)
  - `cycles` (number, optional) - Number of pulses (default: 1.0)
  - `persist` (boolean, optional) - Whether to keep effect running (default: false)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 11. Clouds Effect

- **Endpoint**: `POST /lights/{selector}/effects/clouds`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/clouds`
- **Description**: Applies a clouds effect to lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `period` (number, optional) - Time in seconds for effect (default: 5.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 12. Sunrise Effect

- **Endpoint**: `POST /lights/{selector}/effects/sunrise`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/sunrise`
- **Description**: Applies a sunrise effect to lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `period` (number, optional) - Time in seconds for effect (default: 60.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 13. Sunset Effect

- **Endpoint**: `POST /lights/{selector}/effects/sunset`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/sunset`
- **Description**: Applies a sunset effect to lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `period` (number, optional) - Time in seconds for effect (default: 60.0)
  - `cycles` (number, optional) - Number of cycles (default: 1.0)
  - `power_on` (boolean, optional) - Turn on lights if off (default: true)

### 14. Effects Off

- **Endpoint**: `POST /lights/{selector}/effects/off`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/effects/off`
- **Description**: Turns off any running effects on the device
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `power_off` (boolean, optional) - Also power off the lights (default: false)

### 15. Cycle

- **Endpoint**: `POST /lights/{selector}/cycle`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/cycle`
- **Description**: Cycle through different states
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `states` (array, required) - Array of state objects to cycle through
  - `defaults` (object, optional) - Default values for all states
  - `direction` (string, optional) - "forward" or "backward" (default: "forward")

### 16. List Scenes

- **Endpoint**: `GET /scenes`
- **Full Path**: `https://api.lifx.com/v1/scenes`
- **Description**: Lists all scenes available in the user's account
- **Path Parameters**: None
- **Query Parameters**: None
- **Body Parameters**: None

### 17. Activate Scene

- **Endpoint**: `PUT /scenes/scene_id:{scene_uuid}/activate`
- **Full Path**: `https://api.lifx.com/v1/scenes/scene_id:{scene_uuid}/activate`
- **Description**: Activates a scene from the user's account
- **Path Parameters**:
  - `scene_uuid` (string, required) - UUID of the scene to activate
- **Body Parameters**:
  - `duration` (number, optional) - Transition time in seconds
  - `ignore` (array, optional) - Array of light selectors to ignore
  - `overrides` (object, optional) - State overrides to apply
  - `fast` (boolean, optional) - Skip state checks for faster execution

### 18. Validate Color

- **Endpoint**: `GET /color`
- **Full Path**: `https://api.lifx.com/v1/color`
- **Description**: Validate a color string and return HSBK values
- **Path Parameters**: None
- **Query Parameters**:
  - `string` (string, required) - Color string to validate
- **Body Parameters**: None
- **Example**: `GET /color?string=blue`

### 19. Clean

- **Endpoint**: `POST /lights/{selector}/clean`
- **Full Path**: `https://api.lifx.com/v1/lights/{selector}/clean`
- **Description**: Start or stop the cleaning cycle for supported lights
- **Path Parameters**:
  - `selector` (string, required) - Light selector
- **Body Parameters**:
  - `stop` (boolean, optional) - Stop the cleaning cycle (default: false)
  - `duration` (number, optional) - Cleaning duration in seconds

## Common Parameters

### Selectors

Selectors are used to target specific lights. Common formats:

- `all` - All lights
- `id:d3b2f2d97452` - Specific light by ID
- `label:Kitchen` - Lights with specific label
- `group:Living Room` - Lights in specific group
- `location:Home` - Lights in specific location

### Colors

Color can be specified in various formats:

- Named colors: `"red"`, `"blue"`, `"green"`
- RGB: `"rgb:255,0,0"`
- HSB: `"hue:120 saturation:1.0 brightness:0.5"`
- Kelvin: `"kelvin:3500"`
- Hex: `"#ff0000"`

### Common Response Codes

- `200 OK` - Successful operation
- `202 Accepted` - Request accepted (fast mode)
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

---

_Last updated: June 3, 2025_
_Source: [LIFX API Documentation](https://api.developer.lifx.com/reference/introduction)_
