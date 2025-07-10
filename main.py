from flask import Flask, request, Response
import asyncio as asy
import perchance

app = Flask(__name__)

async def pp(prompt):
  gen = perchance.TextGenerator()
  text = ""
  async for chunk in gen.text(prompt):
    text += chunk

  return text

@app.route('/proc', methods=['GET'])
def handle_request():
    prompt = request.args.get('prompt')
    if not prompt:
        return Response('Missing "prompt" parameter', status=400, mimetype='text/plain')
    response = await pp(prompt)
    return Response(response, mimetype='text/plain')

if __name__ == '__main__':
    app.run(debug=True)
