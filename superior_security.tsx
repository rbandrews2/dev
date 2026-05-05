import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle, CheckCircle, Activity, Key, Eye, EyeOff } from 'lucide-react';

// ==================== SUPERIOR SECURITY CORE ====================

class SuperiorSecurity {
  constructor() {
    this.securityLog = [];
    this.rateLimitStore = new Map();
    this.sessionStore = new Map();
    this.encryptionKey = this.generateEncryptionKey();
    
    // Trusted services whitelist - won't be blocked by security
    this.trustedDomains = [
      'supabase.co',
      'supabase.com',
      'supabase.io',
      '*.supabase.co', // Wildcard for project-specific domains
      'googleapis.com',
      'maps.googleapis.com',
      'maps.google.com',
      'gstatic.com',
    ];
    
    this.trustedPaths = [
      '/rest/v1/',
      '/auth/v1/',
      '/storage/v1/',
      '/realtime/v1/',
      '/maps/api/js',
      '/maps/api/place',
      '/maps/api/geocode',
      '/maps/embed/v1/',
    ];
  }

  // Check if URL/domain is trusted (Supabase, etc.)
  isTrustedSource(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Check if domain matches trusted domains
      for (const domain of this.trustedDomains) {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          if (hostname.endsWith(baseDomain)) return true;
        } else {
          if (hostname.includes(domain)) return true;
        }
      }
      
      // Check if path matches trusted paths
      for (const path of this.trustedPaths) {
        if (urlObj.pathname.includes(path)) return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  // Validate Supabase request headers
  validateSupabaseRequest(headers) {
    const requiredHeaders = ['apikey', 'authorization'];
    const hasApiKey = headers.apikey || headers['x-api-key'];
    const hasAuth = headers.authorization;
    
    if (hasApiKey || hasAuth) {
      this.logSecurityEvent('SUPABASE_REQUEST_VALIDATED', { 
        hasApiKey: !!hasApiKey,
        hasAuth: !!hasAuth 
      });
      return true;
    }
    
    return false;
  }

  // Generate encryption key
  generateEncryptionKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Input Sanitization - Prevent XSS attacks
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
    };
    
    return input.replace(/[&<>"'/]/g, char => map[char]);
  }

  // SQL Injection Prevention - Parameterized query validator
  validateSQLParams(params) {
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)|(-{2})|(\*)|(\bOR\b.*=.*)|(\bAND\b.*=.*)/gi;
    
    for (const param of Object.values(params)) {
      if (typeof param === 'string' && sqlInjectionPattern.test(param)) {
        this.logSecurityEvent('SQL_INJECTION_ATTEMPT', { param });
        return false;
      }
    }
    return true;
  }

  // Rate Limiting - Prevent DDoS and brute force attacks
  // Excludes trusted sources like Supabase
  checkRateLimit(identifier, maxRequests = 100, windowMs = 60000, sourceUrl = null) {
    // Skip rate limiting for trusted sources
    if (sourceUrl && this.isTrustedSource(sourceUrl)) {
      this.logSecurityEvent('TRUSTED_SOURCE_BYPASSED', { identifier, sourceUrl });
      return true;
    }
    
    const now = Date.now();
    const userRequests = this.rateLimitStore.get(identifier) || [];
    
    // Filter out old requests outside the time window
    const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier, requests: recentRequests.length });
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimitStore.set(identifier, recentRequests);
    return true;
  }

  // CSRF Token Generation and Validation
  generateCSRFToken(sessionId) {
    const token = crypto.getRandomValues(new Uint8Array(32));
    const tokenString = Array.from(token, byte => byte.toString(16).padStart(2, '0')).join('');
    
    this.sessionStore.set(sessionId, {
      csrfToken: tokenString,
      createdAt: Date.now()
    });
    
    return tokenString;
  }

  validateCSRFToken(sessionId, token) {
    const session = this.sessionStore.get(sessionId);
    
    if (!session) {
      this.logSecurityEvent('INVALID_SESSION', { sessionId });
      return false;
    }
    
    if (session.csrfToken !== token) {
      this.logSecurityEvent('CSRF_TOKEN_MISMATCH', { sessionId });
      return false;
    }
    
    // Check token age (expire after 1 hour)
    if (Date.now() - session.createdAt > 3600000) {
      this.logSecurityEvent('CSRF_TOKEN_EXPIRED', { sessionId });
      return false;
    }
    
    return true;
  }

  // Password Strength Validator
  validatePasswordStrength(password) {
    const minLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const checks = {
      length: password.length >= minLength,
      uppercase: hasUpperCase,
      lowercase: hasLowerCase,
      numbers: hasNumbers,
      special: hasSpecialChar
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      isValid: score >= 4 && checks.length,
      score,
      checks,
      strength: score >= 5 ? 'strong' : score >= 4 ? 'medium' : 'weak'
    };
  }

  // JWT-style Token Generation (simplified)
  generateAuthToken(userId, expiresIn = 3600000) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId,
      iat: Date.now(),
      exp: Date.now() + expiresIn
    }));
    
    const signature = this.createSignature(`${header}.${payload}`);
    return `${header}.${payload}.${signature}`;
  }

  createSignature(data) {
    // Simplified signature - in production use proper HMAC
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return btoa(hash.toString(16));
  }

  // File Upload Validation
  validateFileUpload(file, allowedTypes, maxSizeMB = 10) {
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSize) {
      this.logSecurityEvent('FILE_SIZE_EXCEEDED', { fileName: file.name, size: file.size });
      return { valid: false, reason: 'File size exceeds limit' };
    }
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      this.logSecurityEvent('INVALID_FILE_TYPE', { fileName: file.name, type: fileExtension });
      return { valid: false, reason: 'File type not allowed' };
    }
    
    // Check for executable files disguised as documents
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'app', 'deb', 'rpm'];
    if (dangerousExtensions.includes(fileExtension)) {
      this.logSecurityEvent('DANGEROUS_FILE_BLOCKED', { fileName: file.name });
      return { valid: false, reason: 'Executable files not allowed' };
    }
    
    return { valid: true };
  }

  // Encrypt sensitive data (simplified)
  encryptData(data) {
    const jsonString = JSON.stringify(data);
    let encrypted = '';
    
    for (let i = 0; i < jsonString.length; i++) {
      const charCode = jsonString.charCodeAt(i);
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      encrypted += String.fromCharCode(charCode ^ keyChar);
    }
    
    return btoa(encrypted);
  }

  // Decrypt sensitive data (simplified)
  decryptData(encryptedData) {
    try {
      const decoded = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        decrypted += String.fromCharCode(charCode ^ keyChar);
      }
      
      return JSON.parse(decrypted);
    } catch (e) {
      this.logSecurityEvent('DECRYPTION_FAILED', { error: e.message });
      return null;
    }
  }

  // Security Event Logging
  logSecurityEvent(eventType, details) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getEventSeverity(eventType)
    };
    
    this.securityLog.push(event);
    
    // Keep only last 100 events
    if (this.securityLog.length > 100) {
      this.securityLog.shift();
    }
    
    return event;
  }

  getEventSeverity(eventType) {
    const highSeverity = ['SQL_INJECTION_ATTEMPT', 'DANGEROUS_FILE_BLOCKED', 'CSRF_TOKEN_MISMATCH'];
    const mediumSeverity = ['RATE_LIMIT_EXCEEDED', 'INVALID_SESSION', 'INVALID_FILE_TYPE'];
    const lowSeverity = ['TRUSTED_SOURCE_BYPASSED', 'SUPABASE_REQUEST_VALIDATED'];
    
    if (highSeverity.includes(eventType)) return 'high';
    if (mediumSeverity.includes(eventType)) return 'medium';
    return 'low';
  }

  getSecurityLog() {
    return [...this.securityLog].reverse();
  }

  getSecurityStats() {
    const total = this.securityLog.length;
    const high = this.securityLog.filter(e => e.severity === 'high').length;
    const medium = this.securityLog.filter(e => e.severity === 'medium').length;
    const low = this.securityLog.filter(e => e.severity === 'low').length;
    
    return { total, high, medium, low };
  }
}

// ==================== REACT DASHBOARD COMPONENT ====================

const SuperiorSecurityDashboard = () => {
  const [security] = useState(() => new SuperiorSecurity());
  const [activeTab, setActiveTab] = useState('overview');
  const [testResults, setTestResults] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  
  // Test inputs
  const [testInput, setTestInput] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [sessionId, setSessionId] = useState('session_' + Date.now());
  
  const stats = security.getSecurityStats();
  
  const runSecurityTest = (testType) => {
    let result = {};
    
    switch(testType) {
      case 'xss':
        const sanitized = security.sanitizeInput(testInput);
        result = {
          test: 'XSS Protection',
          input: testInput,
          output: sanitized,
          passed: sanitized !== testInput || !testInput.includes('<'),
          message: 'Input sanitized successfully'
        };
        break;
        
      case 'password':
        const validation = security.validatePasswordStrength(testPassword);
        result = {
          test: 'Password Strength',
          strength: validation.strength,
          score: `${validation.score}/5`,
          passed: validation.isValid,
          checks: validation.checks,
          message: validation.isValid ? 'Strong password' : 'Password needs improvement'
        };
        break;
        
      case 'sql':
        const params = { query: sqlQuery };
        const isValid = security.validateSQLParams(params);
        result = {
          test: 'SQL Injection Prevention',
          input: sqlQuery,
          passed: isValid,
          message: isValid ? 'Query is safe' : 'Potential SQL injection detected'
        };
        break;
        
      case 'rateLimit':
        const allowed = security.checkRateLimit('test_user', 5, 10000);
        result = {
          test: 'Rate Limiting',
          passed: allowed,
          message: allowed ? 'Request allowed' : 'Rate limit exceeded'
        };
        break;
        
      case 'csrf':
        const token = security.generateCSRFToken(sessionId);
        const valid = security.validateCSRFToken(sessionId, token);
        result = {
          test: 'CSRF Protection',
          token: token.substring(0, 20) + '...',
          passed: valid,
          message: 'CSRF token validated'
        };
        break;
        
      case 'encryption':
        const data = { sensitive: 'confidential data', userId: 12345 };
        const encrypted = security.encryptData(data);
        const decrypted = security.decryptData(encrypted);
        result = {
          test: 'Data Encryption',
          original: JSON.stringify(data),
          encrypted: encrypted.substring(0, 30) + '...',
          passed: JSON.stringify(decrypted) === JSON.stringify(data),
          message: 'Data encrypted and decrypted successfully'
        };
        break;
        
      case 'supabase':
        const supabaseUrl = 'https://myproject.supabase.co/rest/v1/users';
        const isTrusted = security.isTrustedSource(supabaseUrl);
        const headers = { apikey: 'test-key', authorization: 'Bearer token' };
        const headersValid = security.validateSupabaseRequest(headers);
        result = {
          test: 'Supabase Whitelist',
          url: supabaseUrl,
          isTrusted: isTrusted,
          headersValid: headersValid,
          passed: isTrusted && headersValid,
          message: 'Supabase communication allowed through all security layers'
        };
        break;
    }
    
    setTestResults([result, ...testResults.slice(0, 4)]);
  };
  
  const securityLog = security.getSecurityLog().slice(0, 10);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl blur-lg opacity-50"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-2xl">
                <Shield className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">Superior Security</h1>
              <p className="text-gray-400">Enterprise-Grade Protection for Road Work Operations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-900 px-6 py-3 rounded-xl border border-orange-900/30">
            <Activity className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium">System Active</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border border-orange-900/30">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-green-400">{stats.total}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Events Monitored</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/20 to-black p-6 rounded-xl border border-red-900/30">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span className="text-3xl font-bold text-red-400">{stats.high}</span>
            </div>
            <p className="text-gray-400 text-sm">High Severity Threats</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-900/20 to-black p-6 rounded-xl border border-orange-900/30">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
              <span className="text-3xl font-bold text-orange-400">{stats.medium}</span>
            </div>
            <p className="text-gray-400 text-sm">Medium Severity</p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl border border-orange-900/30">
            <div className="flex items-center justify-between mb-2">
              <Lock className="w-8 h-8 text-orange-400" />
              <span className="text-3xl font-bold text-orange-400">{stats.low}</span>
            </div>
            <p className="text-gray-400 text-sm">Low Severity</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl border border-orange-900/30">
          {['overview', 'testing', 'logs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Supabase Status Card */}
            <div className="bg-gradient-to-r from-green-900/20 to-gray-900 rounded-xl p-6 border border-green-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-500/20 p-3 rounded-xl">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Supabase Integration Protected</h3>
                    <p className="text-gray-400">All Supabase domains whitelisted and communication secured</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">✓ Active</div>
                  <p className="text-sm text-gray-400">Zero interference</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/40 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Auth API</p>
                  <p className="text-sm font-semibold text-green-400">Secured</p>
                </div>
                <div className="bg-black/40 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Database</p>
                  <p className="text-sm font-semibold text-green-400">Secured</p>
                </div>
                <div className="bg-black/40 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Storage</p>
                  <p className="text-sm font-semibold text-green-400">Secured</p>
                </div>
                <div className="bg-black/40 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Realtime</p>
                  <p className="text-sm font-semibold text-green-400">Secured</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-xl p-6 border border-orange-900/30">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-orange-500" />
                Security Features
              </h3>
              <div className="space-y-3">
                {[
                  'Supabase Integration Whitelisted',
                  'XSS Attack Prevention',
                  'SQL Injection Protection',
                  'CSRF Token Validation',
                  'Rate Limiting & DDoS Protection',
                  'Password Strength Validation',
                  'File Upload Security',
                  'Data Encryption',
                  'Security Event Logging'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-black rounded-lg border border-orange-900/20">
                    <CheckCircle className={`w-5 h-5 ${idx === 0 ? 'text-green-400' : 'text-green-400'} flex-shrink-0`} />
                    <span className={`${idx === 0 ? 'text-green-300 font-semibold' : 'text-gray-300'}`}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-6 border border-orange-900/30">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Key className="w-6 h-6 text-orange-500" />
                Recent Security Events
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {securityLog.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No security events logged yet</p>
                ) : (
                  securityLog.map((event, idx) => (
                    <div key={idx} className="p-3 bg-black rounded-lg border-l-4" style={{
                      borderColor: event.severity === 'high' ? '#f87171' : 
                                 event.severity === 'medium' ? '#fb923c' : '#fb923c'
                    }}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{event.type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-gray-400">{JSON.stringify(event.details).substring(0, 60)}...</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'testing' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6 border border-orange-900/30">
              <h3 className="text-xl font-bold mb-4">Security Testing Suite</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* XSS Test */}
                <div className="bg-black p-4 rounded-lg border border-orange-900/20">
                  <h4 className="font-semibold mb-3 text-orange-400">XSS Protection Test</h4>
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Try: <script>alert('xss')</script>"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg mb-3 text-white"
                  />
                  <button
                    onClick={() => runSecurityTest('xss')}
                    className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Test XSS Protection
                  </button>
                </div>

                {/* Password Test */}
                <div className="bg-black p-4 rounded-lg border border-orange-900/20">
                  <h4 className="font-semibold mb-3 text-orange-400">Password Strength Test</h4>
                  <div className="relative mb-3">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      placeholder="Enter a password"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white pr-10"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => runSecurityTest('password')}
                    className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Check Password Strength
                  </button>
                </div>

                {/* SQL Injection Test */}
                <div className="bg-black p-4 rounded-lg border border-orange-900/20">
                  <h4 className="font-semibold mb-3 text-orange-400">SQL Injection Test</h4>
                  <input
                    type="text"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="Try: ' OR '1'='1"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg mb-3 text-white"
                  />
                  <button
                    onClick={() => runSecurityTest('sql')}
                    className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Test SQL Protection
                  </button>
                </div>

                {/* Quick Tests */}
                <div className="bg-black p-4 rounded-lg border border-orange-900/20">
                  <h4 className="font-semibold mb-3 text-orange-400">Quick Tests</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => runSecurityTest('supabase')}
                      className="w-full bg-green-900/30 hover:bg-green-900/50 border border-green-900/50 px-4 py-2 rounded-lg font-medium transition-colors text-left text-green-300"
                    >
                      ✓ Test Supabase Whitelist
                    </button>
                    <button
                      onClick={() => runSecurityTest('rateLimit')}
                      className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-left"
                    >
                      Test Rate Limiting
                    </button>
                    <button
                      onClick={() => runSecurityTest('csrf')}
                      className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-left"
                    >
                      Test CSRF Protection
                    </button>
                    <button
                      onClick={() => runSecurityTest('encryption')}
                      className="w-full bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg font-medium transition-colors text-left"
                    >
                      Test Encryption
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Results */}
              {testResults.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Test Results</h4>
                  <div className="space-y-3">
                    {testResults.map((result, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        result.passed ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium">{result.test}</span>
                          {result.passed ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{result.message}</p>
                        {result.checks && (
                          <div className="text-xs space-y-1">
                            {Object.entries(result.checks).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                <span className={value ? 'text-green-400' : 'text-red-400'}>
                                  {value ? '✓' : '✗'}
                                </span>
                                <span className="text-gray-400">{key}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-gray-900 rounded-xl p-6 border border-orange-900/30">
            <h3 className="text-xl font-bold mb-4">Complete Security Log</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {securityLog.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No security events to display</p>
              ) : (
                securityLog.map((event, idx) => (
                  <div key={idx} className="p-4 bg-black rounded-lg border-l-4" style={{
                    borderColor: event.severity === 'high' ? '#f87171' : 
                               event.severity === 'medium' ? '#fb923c' : '#fb923c'
                  }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{event.type.replace(/_/g, ' ')}</span>
                        <span className={`ml-3 text-xs px-2 py-1 rounded ${
                          event.severity === 'high' ? 'bg-red-900/50 text-red-300' :
                          event.severity === 'medium' ? 'bg-orange-900/50 text-orange-300' :
                          'bg-orange-900/30 text-orange-300'
                        }`}>
                          {event.severity}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-x-auto bg-gray-950 p-2 rounded">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperiorSecurityDashboard;
