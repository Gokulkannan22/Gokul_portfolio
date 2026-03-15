FROM python:3.10

# Set the working directory
WORKDIR /code

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install the Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the application code
COPY . /code

# Change permissions to ensure Gradio can write to necessary directories if needed
RUN chmod -R 777 /code

# Command to run the application
CMD ["python", "app.py"]
