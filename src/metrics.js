const config = require('./config.js');
const os = require('os');

const USER_ID = config.metrics.userId;
const API_KEY = config.metrics.apiKey;
const SOURCE = config.metrics.source;

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.postRequests = 0;
    this.getRequests = 0;
    this.deleteRequests = 0;
    this.putRequests = 0;
    this.pizzasOrdered = 0;
    this.activeUsers = 0;
    this.authSuccesses = 0;
    this.authFailures = 0;
    this.revenue = 0;
    this.creationFailures = 0;
    this.creationLatency = 0;

    // This will periodically sent metrics to Grafana
    setInterval(() => {
      this.sendMetricToGrafana('request', 'all', 'total', this.totalRequests);
      this.sendMetricToGrafana('request', 'post', 'total', this.postRequests);
      this.sendMetricToGrafana('request', 'get', 'total', this.getRequests);
      this.sendMetricToGrafana('request', 'delete', 'total', this.deleteRequests);
      this.sendMetricToGrafana('request', 'put', 'total', this.putRequests);
      this.sendMetricToGrafana('cpu', 'all', 'usage', this.getCpuUsagePercentage());
      this.sendMetricToGrafana('memory', 'all', 'usage', this.getMemoryUsagePercentage());
      this.sendMetricToGrafana('order', 'all', 'total', this.pizzasOrdered);
      this.sendMetricToGrafana('user', 'all', 'active', this.activeUsers);
      this.sendMetricToGrafana('auth', 'all', 'success', this.authSuccesses);
      this.sendMetricToGrafana('auth', 'all', 'failure', this.authFailures);
      this.sendMetricToGrafana('order', 'all', 'revenue', this.revenue);
      this.sendMetricToGrafana('order', 'all', 'failure', this.creationFailures);
      this.sendMetricToGrafana('order', 'all', 'latency', this.creationLatency);
    }, 10000);
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  requestTracker(req, _, next) {
    switch (req.method) {
      case 'POST':
        this.postRequests++;
        break;
      case 'GET':
        this.getRequests++;
        break;
      case 'DELETE':
        this.deleteRequests++;
        break;
      case 'PUT':
        this.putRequests++;
        break;
      default:
        break;
    }
    this.totalRequests++;
    next();
  }

  login() {
    this.authSuccesses++;
    this.activeUsers++;
  }

  authSuccess() {
    this.authSuccesses++;
  }

  authFailure() {
    this.authFailures++;
  }

  logout() {
    this.activeUsers--;
  }

  orderPlaced(order) {
    this.pizzasOrdered += order.items.length;
    for (const item of order.items) {
      this.revenue += item.price;
    }
  }

  creationFailure() {
    this.creationFailures++;
  }

  setCreationLatency(latency) {
    this.creationLatency = latency;
  }

  sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${SOURCE},method=${httpMethod} ${metricName}=${metricValue}`;

    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${USER_ID}:${API_KEY}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

const metrics = new Metrics();
module.exports = metrics;
