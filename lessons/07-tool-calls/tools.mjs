export const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "查询某地天气。用户需先给出地点。",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "城市名，如杭州、北京" },
        },
        required: ["location"],
      },
    },
  },
];

const weather = { 杭州: "24℃ 多云", 北京: "晴 25°C", 上海: "22℃ 阴" };

export function runTool(call) {
  const { location } = JSON.parse(call.function.arguments);
  return weather[location] ?? `（演示）${location}：晴 20℃`;
}
