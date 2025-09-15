import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [templateFile, setTemplateFile] = useState(null);
    const [placeholders, setPlaceholders] = useState([{ key: '', value: '' }]);
    const [outputFormat, setOutputFormat] = useState('docx');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        setTemplateFile(e.target.files[0]);
    };

    const handlePlaceholderChange = (index, field, value) => {
        const newPlaceholders = [...placeholders];
        newPlaceholders[index][field] = value;
        setPlaceholders(newPlaceholders);
    };

    const addPlaceholder = () => {
        setPlaceholders([...placeholders, { key: '', value: '' }]);
    };

    const removePlaceholder = (index) => {
        const newPlaceholders = placeholders.filter((_, i) => i !== index);
        setPlaceholders(newPlaceholders);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!templateFile) {
            setError('Please upload a template file.');
            return;
        }

        setIsLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('template', templateFile);
        
        const dataObject = placeholders.reduce((obj, item) => {
            if (item.key) {
                obj[item.key] = item.value;
            }
            return obj;
        }, {});
        
        formData.append('data', JSON.stringify(dataObject));
        formData.append('outputFormat', outputFormat);

        try {
            const response = await axios.post('http://localhost:5001/api/generate', formData, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            const fileName = response.headers['content-disposition'].split('filename=')[1].replace(/"/g, '');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

        } catch (err) {
            console.error(err);
            const reader = new FileReader();
            reader.onload = () => {
                setError(reader.result);
            };
            if(err.response && err.response.data){
                reader.readAsText(err.response.data);
            } else {
                 setError('An error occurred during file generation.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow">
                <div className="container mx-auto px-6 py-4">
                    <h1 className="text-3xl font-bold text-gray-800">Document Generator</h1>
                    <p className="text-gray-600 mt-1">Upload a .docx template, fill in the placeholders, and generate your document.</p>
                </div>
            </header>
            
            <main className="container mx-auto px-6 py-8">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div>
                            <label htmlFor="template-upload" className="block text-lg font-medium text-gray-700">1. Upload Template (.docx)</label>
                            <div className="mt-2 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="template-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                            <span>Upload a file</span>
                                            <input id="template-upload" name="template-upload" type="file" className="sr-only" accept=".docx" onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">DOCX up to 10MB</p>
                                    {templateFile && <p className="text-sm text-green-600 mt-2 font-semibold">{templateFile.name}</p>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-lg font-medium text-gray-700">2. Fill Placeholders</label>
                            <p className="text-sm text-gray-500">Your template should use placeholders like `{'{name}'}`.</p>
                            <div className="mt-4 space-y-4">
                                {placeholders.map((p, index) => (
                                    <div key={index} className="flex items-center space-x-3">
                                        <input
                                            type="text"
                                            placeholder="Template Key (e.g., name)"
                                            value={p.key}
                                            onChange={(e) => handlePlaceholderChange(index, 'key', e.target.value)}
                                            className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Value to Insert"
                                            value={p.value}
                                            onChange={(e) => handlePlaceholderChange(index, 'value', e.target.value)}
                                            className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                        <button type="button" onClick={() => removePlaceholder(index)} className="p-2 text-gray-400 hover:text-red-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addPlaceholder} className="w-full flex justify-center py-2 px-4 border border-dashed border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                    + Add Placeholder
                                </button>
                            </div>
                        </div>
                        
                         <div>
                            <label className="block text-lg font-medium text-gray-700">3. Select Output Format</label>
                            <div className="mt-2">
                                <select 
                                    value={outputFormat} 
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value="docx">Word Document (.docx)</option>
                                    <option value="pdf">PDF Document (.pdf)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                            >
                                {isLoading ? 'Generating...' : 'Generate Document'}
                            </button>
                        </div>
                        {error && <p className="text-red-600 text-center">{error}</p>}
                    </form>
                </div>
            </main>
        </div>
    );
}

export default App;

