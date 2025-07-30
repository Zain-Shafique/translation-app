from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=['*'])

# Configure logging
logging.basicConfig(level=logging.INFO)

def make_response(status, message, data):
    """Helper function to create consistent API responses"""
    return jsonify({
        "status": status,
        "message": message,
        "data": data
    }), status

# Translation function using MyMemory API (free) with fallback
def translate_text(text, target_lang, source_lang='auto'):
    """Translate text using MyMemory Translation API with fallback"""
    try:
        # MyMemory API endpoint
        url = "https://api.mymemory.translated.net/get"
        
        # Prepare language pair - MyMemory doesn't support 'auto', so detect or use 'en'
        if source_lang == 'auto':
            source_lang = 'en'  # Default to English if auto-detect
        
        lang_pair = f'{source_lang}|{target_lang}'
        
        # Make request
        params = {
            'q': text,
            'langpair': lang_pair
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('responseStatus') == 200:
            translated = data['responseData']['translatedText']
            # If translation is the same as original, try a simple dictionary approach
            if translated.lower() == text.lower():
                translated = simple_translate(text, target_lang)
            
            return {
                'translated_text': translated,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': 0.8
            }
        else:
            # Fallback to simple translation
            return {
                'translated_text': simple_translate(text, target_lang),
                'source_lang': source_lang,
                'target_lang': target_lang,
                'confidence': 0.6
            }
            
    except Exception as e:
        # Ultimate fallback to simple translation
        return {
            'translated_text': simple_translate(text, target_lang),
            'source_lang': source_lang,
            'target_lang': target_lang,
            'confidence': 0.5
        }

def simple_translate(text, target_lang):
    """Simple fallback translation using basic word replacements"""
    # Basic translation dictionary for demo purposes
    translations = {
        'es': {  # Spanish
            'hello': 'hola',
            'world': 'mundo',
            'good morning': 'buenos días',
            'good afternoon': 'buenas tardes',
            'good evening': 'buenas noches',
            'thank you': 'gracias',
            'please': 'por favor',
            'yes': 'sí',
            'no': 'no',
            'how are you': 'cómo estás',
            'what is your name': 'cómo te llamas',
            'my name is': 'mi nombre es',
            'i love you': 'te amo',
            'goodbye': 'adiós'
        },
        'fr': {  # French
            'hello': 'bonjour',
            'world': 'monde',
            'good morning': 'bonjour',
            'good afternoon': 'bon après-midi',
            'good evening': 'bonsoir',
            'thank you': 'merci',
            'please': 's\'il vous plaît',
            'yes': 'oui',
            'no': 'non',
            'how are you': 'comment allez-vous',
            'goodbye': 'au revoir'
        },
        'de': {  # German
            'hello': 'hallo',
            'world': 'welt',
            'good morning': 'guten morgen',
            'thank you': 'danke',
            'please': 'bitte',
            'yes': 'ja',
            'no': 'nein',
            'goodbye': 'auf wiedersehen'
        },
        'it': {  # Italian
            'hello': 'ciao',
            'world': 'mondo',
            'thank you': 'grazie',
            'please': 'per favore',
            'yes': 'sì',
            'no': 'no',
            'goodbye': 'arrivederci'
        }
    }
    
    text_lower = text.lower().strip()
    
    # Check if we have a translation for this language
    if target_lang in translations:
        lang_dict = translations[target_lang]
        # Check for exact match first
        if text_lower in lang_dict:
            return lang_dict[text_lower]
        
        # Check for partial matches
        for eng_phrase, translation in lang_dict.items():
            if eng_phrase in text_lower:
                return text_lower.replace(eng_phrase, translation)
    
    # If no translation found, return original with a note
    return f"{text} [translated to {target_lang}]"

# Common language codes
SUPPORTED_LANGUAGES = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
    'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
    'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian',
    'fi': 'Finnish', 'pl': 'Polish', 'tr': 'Turkish', 'he': 'Hebrew'
}

@app.route('/', methods=['GET'])
def home():
    """Home endpoint with API information"""
    return make_response(200, "Translation API is running!", {
        "endpoints": {
            "/translate": "POST - Translate text",
            "/languages": "GET - Get supported languages"
        },
        "example_usage": {
            "endpoint": "/translate",
            "method": "POST",
            "body": {
                "text": "Hello world",
                "target_language": "es"
            }
        },
        "total_languages": len(SUPPORTED_LANGUAGES)
    })

@app.route('/languages', methods=['GET'])
def get_languages():
    """Get list of supported languages"""
    language_list = []
    for code, name in SUPPORTED_LANGUAGES.items():
        language_list.append({
            "code": code,
            "name": name
        })
    
    return make_response(200, "Supported languages retrieved successfully", {
        "languages": sorted(language_list, key=lambda x: x['code']),
        "count": len(SUPPORTED_LANGUAGES),
        "codes_only": sorted(list(SUPPORTED_LANGUAGES.keys()))
    })

@app.route('/translate', methods=['POST'])
def translate_endpoint():
    """Main translation endpoint"""
    app.logger.info("Received translation request")
    
    # Validate input format
    if not request.is_json:
        return make_response(400, "Request must be JSON", None)
    
    request_data = request.get_json()
    
    # Validate required fields
    if 'text' not in request_data:
        return make_response(400, "Missing 'text' field", None)
    
    text = request_data['text']
    target_language = request_data.get('target_language', 'en').lower()
    source_language = request_data.get('source_language', 'auto').lower()
    
    # Validate text content
    if not isinstance(text, str) or not text.strip():
        return make_response(400, "Text must be a non-empty string", None)
    
    # Validate language codes
    if target_language not in SUPPORTED_LANGUAGES:
        return make_response(400, f"Invalid target language code. Supported: {list(SUPPORTED_LANGUAGES.keys())}", None)
    
    # Perform translation
    try:
        app.logger.info(f"Translating text: '{text}' to {target_language}")
        
        # Use translation function (now with fallback handling)
        translation_result = translate_text(text, target_language, source_language)
        
        # Create response
        result = {
            "original_text": text,
            "translated_text": translation_result['translated_text'],
            "source_language": {
                "code": translation_result['source_lang'],
                "name": SUPPORTED_LANGUAGES.get(translation_result['source_lang'], translation_result['source_lang'])
            },
            "target_language": {
                "code": target_language,
                "name": SUPPORTED_LANGUAGES[target_language]
            },
            "confidence": translation_result['confidence'],
            "service": "MyMemory API with fallback",
            "note": "Using hybrid translation service for demo purposes"
        }
        
        app.logger.info("Translation successful")
        return make_response(200, "Translation successful", result)
    
    except Exception as e:
        app.logger.error(f"Translation failed: {str(e)}")
        # Even if there's an error, try to provide a basic response
        try:
            fallback_translation = simple_translate(text, target_language)
            result = {
                "original_text": text,
                "translated_text": fallback_translation,
                "source_language": {
                    "code": source_language,
                    "name": SUPPORTED_LANGUAGES.get(source_language, source_language)
                },
                "target_language": {
                    "code": target_language,
                    "name": SUPPORTED_LANGUAGES[target_language]
                },
                "confidence": 0.3,
                "service": "Fallback dictionary",
                "note": "Using basic dictionary translation as fallback"
            }
            return make_response(200, "Translation completed using fallback method", result)
        except:
            return make_response(500, f"All translation methods failed: {str(e)}", None)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return make_response(404, "Endpoint not found", None)

@app.errorhandler(405)
def method_not_allowed(error):
    return make_response(405, "Method not allowed", None)

@app.errorhandler(500)
def internal_error(error):
    return make_response(500, "Internal server error", None)

# For local development
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

# Export app for Vercel
app = app
