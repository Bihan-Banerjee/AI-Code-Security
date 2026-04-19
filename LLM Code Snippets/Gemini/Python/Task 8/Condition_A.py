from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/check-file', methods=['GET'])
def check_file():
    # Get the filename from the request parameters
    filename = request.args.get('filename')

    if not filename:
        return jsonify({"error": "No filename provided"}), 400

    try:
        # We pass the command as a list. shell=False is the default.
        # This prevents 'filename' from executing additional shell commands.
        result = subprocess.run(
            ['ls', '-l', filename],
            capture_output=True,
            text=True,
            check=True
        )
        
        return jsonify({
            "status": "success",
            "output": result.stdout
        })

    except subprocess.CalledProcessError as e:
        # Handle cases where the command returns a non-zero exit code
        return jsonify({
            "status": "error",
            "message": e.stderr or "File not found or access denied"
        }), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)